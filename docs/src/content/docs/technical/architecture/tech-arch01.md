---
title: 工作流平台架构设计：解决嵌套执行中的分层架构冲突
pubDate: 2025-08-15
categories: ["技术"," 分层架构","工作流嵌套"]
description: "本文深入探讨可视化工作流平台中的核心架构难题：当用户需要将已构建的工作流作为子模块在其他工作流中调用时，WorkflowNode（Model层）必须调用WorkflowExecService（Service层）来执行嵌套工作流，这直接违反了分层架构的基本原则。"
---
# 工作流平台架构设计：解决嵌套执行中的分层架构冲突

##  业务背景

我们在开发一个可视化工作流平台，用户通过拖拽节点构建业务流程。平台支持LLM调用、插件执行、数据处理等多种节点类型。

## 现有架构

```
┌───────────────────────┐
│   WorkflowExecService │  服务层：工作流执行服务
├───────────────────────┤
│     DirectedGraph     │  执行层：有向图执行引擎
├───────────────────────┤
│        Node           │  模型层：节点抽象基类
│  ┌─────────┬─────────┐│
│  │ LLMNode │PluginNode│  具体节点实现
│  └─────────┴─────────┘│
└───────────────────────┘
```

**核心执行流程：**

```java
public class DirectedGraph {
    public Map<String, Object> executeWorkflow(...) {
        Queue<Node> queue = topologicalSort();
        while (!queue.isEmpty()) {
            Node node = queue.poll();
            node.exec(params, input);  // 执行节点
            processSuccessors(node, queue);
        }
        return result;
    }
}

public abstract class Node {
    public abstract void exec(Map<String, Object> params, 
                             Map<String, Object> input);
}
```

##  问题引爆点

用户需求：**已构建的工作流要能作为子模块被其他工作流调用**

例如用户构建了"文档摘要生成"工作流，现在想在"智能客服"工作流中复用它：

```
主工作流：智能客服
├── 用户输入
├── 意图识别（LLM节点）
├── 文档摘要生成（🔥 WorkflowNode - 调用子工作流）
└── 回复生成
```

##  核心架构冲突

引入WorkflowNode后遇到致命问题：

```java
public class WorkflowNode extends Node {
    private Workflow subWorkflow;
    
    @Override
    public void exec(Map<String, Object> params, Map<String, Object> input) {
        // ❌ 问题：Model层需要调用Service层！
        // 需要执行子工作流，但如何调用WorkflowExecService？
        
        // 方案1：直接调用Service？
        WorkflowExecService service = ???; // 违反分层架构
        
        // 方案2：依赖注入？
        @Autowired // ❌ Node是数据模型，无法注入
        
        // 方案3：参数传递？
        // 需要在整个调用链路传递Service，复杂度爆炸
    }
}
```

**架构冲突示意图：**

```
┌───────────────────────┐
│  WorkflowExecService  │ ← Service层
├───────────────────────┤
│    DirectedGraph      │ ← Execution层  
├───────────────────────┤
│    WorkflowNode       │ ← Model层
│         ↑             │
│    ❌ 需要调用Service  │   违反分层原则
└───────────────────────┘
```

## 问题复杂化

### 1. 嵌套执行问题

用户实际构建的工作流更复杂：

```
工作流A → 工作流B → 工作流C → 工作流D
              ↓
          工作流E → 工作流F
```

**挑战：**

- 如何实现安全的递归调用？
- 如何传递执行上下文（sessionId、execId等）？

### 2. 循环依赖风险

```
工作流A 调用 工作流B
工作流B 调用 工作流A  ← 💀 无限递归！
```

### 3. 并发安全

多用户同时执行嵌套工作流时的状态隔离问题。

## 亟需解决的核心问题

1. **架构冲突**：Model层如何调用Service层而不违反分层原则？
2. **嵌套执行**：如何实现安全的多层工作流嵌套调用？
3. **循环检测**：如何防止工作流间的循环依赖？
4. **上下文传递**：嵌套执行时如何管理执行状态？

## 解决方案概览

针对WorkflowNode的架构冲突问题，设计了三种解决方案：

1. **委托模式**：WorkflowNode标记委托状态，DirectedGraph检测并处理
2. **工厂模式**：为不同节点类型提供专用执行器，完全解耦执行逻辑
3. **接口隔离模式**：通过接口依赖降低耦合，快速实现

------

## 方案一：委托模式

### 核心思想

WorkflowNode不直接执行子工作流，而是标记特殊状态委托给DirectedGraph处理，保持分层架构清晰。

### 架构图

```
┌─────────────────────────────────────┐
│            Client                   │  调用层
├─────────────────────────────────────┤
│       WorkflowExecService           │  服务层
├─────────────────────────────────────┤
│        DirectedGraph                │  执行层
│    ┌───────────────────────────┐    │  ├─ 检测委托状态
│    │   SubWorkflowHandler      │    │  └─ 处理子工作流
│    └───────────────────────────┘    │
├─────────────────────────────────────┤
│         WorkflowNode                │  模型层
│      (标记委托状态)                   │  ├─ 不直接调用Service
│                                     │  └─ 通过状态标记委托
├─────────────────────────────────────┤
│          Workflow                   │  数据层
└─────────────────────────────────────┘
```

### 核心实现

```java
// WorkflowNode - 委托标记
public class WorkflowNode extends Node {
    @Override
    public void exec(Map<String, Object> params, Map<String, Object> execInput) {
        try {
            // 检查循环依赖
            if (isCircularReference()) {
                throw new CheckedException("检测到循环工作流依赖");
            }
            
            // 创建委托请求
            Map<String, Object> delegateRequest = Map.of(
                "type", "SUB_WORKFLOW_REQUEST",
                "workflowId", subWorkflow.getIdentity(),
                "inputData", execInput,
                "workflowDefinition", subWorkflow
            );
            
            // 🎯 关键：标记委托状态，不直接执行
            endNodeExec(delegateRequest, ExecStatus.SUB_WORKFLOW_PENDING, null);
            
        } catch (Exception e) {
            endNodeExec(null, ExecStatus.FAILED, e.getMessage());
        }
    }
}

// DirectedGraph - 委托检测与处理
public class DirectedGraph {
    public Map<String, Object> executeWorkflow(...) {
        while (!queue.isEmpty()) {
            Node node = queue.poll();
            node.exec(params, execInput);
            
            // 🎯 关键：检测委托状态
            if (isSubWorkflowRequest(node)) {
                handleSubWorkflow(node, ...);  // 处理委托的子工作流
            }
            
            processSuccessors(node, queue);
        }
    }
    
    private boolean isSubWorkflowRequest(Node node) {
        return node.getNodeResult() != null && 
               ExecStatus.SUB_WORKFLOW_PENDING.equals(node.getNodeResult().getExecStatus());
    }
    
    private void handleSubWorkflow(Node node, ...) {
        try {
            // 获取委托请求信息
            Map<String, Object> request = node.getNodeResult().getOutput();
            Workflow subWorkflow = (Workflow) request.get("workflowDefinition");
            
            // 创建子工作流图并执行
            DirectedGraph subGraph = DirectedGraph.fromGraphJson(subWorkflow.getGraph());
            Map<String, Object> result = subGraph.executeWorkflow(...);
            
            // 更新节点结果
            node.endNodeExec(result, ExecStatus.SUCCESS, null);
        } catch (Exception e) {
            node.endNodeExec(null, ExecStatus.FAILED, e.getMessage());
        }
    }
}
```

### ✅ 优势

- **架构清晰**：保持分层原则，Model层不直接调用Service层
- **实现简单**：代码量较少，概念直观
- **职责明确**：WorkflowNode负责标记，DirectedGraph负责执行

### ❌ 劣势

- **扩展性有限**：新增特殊节点类型需修改DirectedGraph
- **状态耦合**：依赖特殊状态标记机制
- **调试复杂**：委托流程不够直观

------

## 方案二：工厂模式

### 核心思想

为不同类型节点提供专用执行器，通过工厂模式管理，执行逻辑与节点模型完全分离。

### 架构图

```
┌─────────────────────────────────────┐
│            Client                   │  调用层
├─────────────────────────────────────┤
│       WorkflowExecService           │  服务层
│       WorkflowGraphExecutor         │  ├─ 图执行器(抽离)
├─────────────────────────────────────┤
│      NodeExecutorFactory            │  工厂层+策略模式
│  ┌─────────────┬─────────────────┐  │  ├─ 管理所有执行器
│  │WorkflowNode │    PluginNode   │  │  ├─ 类型安全分发
│  │  Executor   │    Executor     │  │  └─ 支持动态扩展
│  └─────────────┴─────────────────┘  │
│  ┌─────────────┬─────────────────┐  │
│  │  LLMNode    │   其他Node       │  │
│  │  Executor   │   Executor      │  │
│  └─────────────┴─────────────────┘  │
├─────────────────────────────────────┤
│        DirectedGraph                │  执行层
│    (委托给GraphExecutor)             │  ├─ 保持向后兼容
├─────────────────────────────────────┤
│   WorkflowNode | PluginNode | ...   │  模型层
│        (纯数据模型)                   │  └─ 不包含执行逻辑
├─────────────────────────────────────┤
│          Workflow                   │  数据层
└─────────────────────────────────────┘
```

### 核心实现

```java
// 执行器接口
public interface NodeExecutor<T extends Node> {
    void execute(T node, Map<String, Object> params, 
                Map<String, Object> execInput, WorkflowExecutionContext context);
    boolean supports(Class<? extends Node> nodeClass);
}

// WorkflowNode专用执行器
@Component
public class WorkflowNodeExecutor implements NodeExecutor<WorkflowNode> {
    @Autowired
    private WorkflowGraphExecutor graphExecutor;
    
    @Override
    public void execute(WorkflowNode node, Map<String, Object> params, 
                       Map<String, Object> execInput, WorkflowExecutionContext context) {
        
        String subWorkflowId = node.getSubWorkflow().getIdentity();
        
        // 循环依赖检查
        if (context.hasCircularDependency(subWorkflowId)) {
            throw new CheckedException("循环依赖: " + subWorkflowId);
        }
        
        // 创建子上下文
        WorkflowExecutionContext childContext = context.createChildContext(subWorkflowId);
        
        // 🎯 关键：递归调用图执行器
        Map<String, Object> result = graphExecutor.executeWorkflow(
            node.getSubWorkflow(), execInput, childContext);
        
        node.endNodeExec(result, ExecStatus.SUCCESS, null);
    }
    
    @Override
    public boolean supports(Class<? extends Node> nodeClass) {
        return WorkflowNode.class.isAssignableFrom(nodeClass);
    }
}

// 执行器工厂
@Component
public class NodeExecutorFactory {
    private final List<NodeExecutor> executors;
    
    @SuppressWarnings("unchecked")
    public <T extends Node> NodeExecutor<T> getExecutor(Class<T> nodeClass) {
        return executors.stream()
            .filter(executor -> executor.supports(nodeClass))
            .findFirst()
            .orElse(null);
    }
}

// 图执行器（从DirectedGraph抽离）
@Component
public class WorkflowGraphExecutor {
    @Autowired
    private NodeExecutorFactory executorFactory;
    
    public Map<String, Object> executeWorkflow(Workflow workflow, 
                                              Map<String, Object> params,
                                              WorkflowExecutionContext context) {
        DirectedGraph graph = DirectedGraph.fromGraphJson(workflow.getGraph());
        
        while (!queue.isEmpty()) {
            Node node = queue.poll();
            
            // 🎯 关键：工厂选择执行器
            NodeExecutor executor = executorFactory.getExecutor(node.getClass());
            if (executor != null) {
                executor.execute(node, params, execInput, context);
            } else {
                // 默认执行方法
                node.exec(params, execInput);
            }
        }
        return result;
    }
}

// 执行上下文
@Data @Builder
public class WorkflowExecutionContext {
    private List<String> executionChain;  // 执行链，用于循环检测
    private int nestingLevel;             // 嵌套层级
    private String execId;
    private String sessionId;
    
    public WorkflowExecutionContext createChildContext(String childWorkflowId) {
        List<String> newChain = new ArrayList<>(this.executionChain);
        newChain.add(childWorkflowId);
        
        return WorkflowExecutionContext.builder()
            .executionChain(newChain)
            .nestingLevel(this.nestingLevel + 1)
            .execId(generateChildExecId())
            .sessionId(this.sessionId)
            .build();
    }
    
    public boolean hasCircularDependency(String workflowId) {
        return executionChain.contains(workflowId);
    }
}
```

### ✅ 优势

- **高度解耦**：执行逻辑与节点模型完全分离
- **扩展性强**：新增节点类型只需添加对应执行器
- **类型安全**：泛型确保编译期类型检查
- **易于测试**：每个执行器可独立测试

### ❌ 劣势

- **复杂度高**：引入多个抽象层，学习成本高
- **类数量多**：每种节点类型需要对应执行器
- **配置复杂**：需要管理执行器注册和映射
- 违背分层原则：在executor层返回调用factory

------

## 方案三：接口隔离模式

### 核心思想

允许WorkflowNode调用Service，但通过接口隔离降低耦合，是最实用的妥协方案。

###  架构图

```
┌─────────────────────────────────────┐
│            Client                   │  调用层
├─────────────────────────────────────┤
│       WorkflowExecService           │  服务层
│          (实现接口)                  │  └─ 实现子工作流执行接口
├─────────────────────────────────────┤
│      SubWorkflowExecutor            │  接口层
│         (隔离接口)                   │  └─ 定义子工作流执行契约
├─────────────────────────────────────┤
│        DirectedGraph                │  执行层
│      (注入接口依赖)                   │  └─ 为WorkflowNode注入接口
├─────────────────────────────────────┤
│         WorkflowNode                │  模型层
│      (依赖接口调用)                   │  └─ 通过接口调用，降低耦合
├─────────────────────────────────────┤
│          Workflow                   │  数据层
└─────────────────────────────────────┘
```

### 核心实现

```java
// 子工作流执行接口
public interface SubWorkflowExecutor {
    Map<String, Object> executeSubWorkflow(String workflowId, 
                                          Map<String, Object> inputData, 
                                          String sessionId);
    
    boolean hasCircularDependency(String workflowId, List<String> executionChain);
}

// WorkflowExecService实现接口
@Service
public class WorkflowExecService implements SubWorkflowExecutor {
    @Override
    public Map<String, Object> executeSubWorkflow(String workflowId, 
                                                 Map<String, Object> inputData, 
                                                 String sessionId) {
        // 获取工作流定义
        Workflow workflow = workflowService.getByIdentity(workflowId);
        
        // 创建子工作流图并执行
        DirectedGraph subGraph = DirectedGraph.fromGraphJson(workflow.getGraph());
        return subGraph.executeWorkflow(inputData, generateChildExecId(), sessionId);
    }
    
    @Override
    public boolean hasCircularDependency(String workflowId, List<String> executionChain) {
        return executionChain.contains(workflowId);
    }
}

// WorkflowNode使用接口依赖
public class WorkflowNode extends Node {
    private Workflow subWorkflow;
    
    // 运行时注入（在DirectedGraph中设置）
    @JsonIgnore
    private transient SubWorkflowExecutor subWorkflowExecutor;
    @JsonIgnore
    private transient String currentSessionId;
    @JsonIgnore
    private transient List<String> executionChain;
    
    public void setExecutionDependencies(SubWorkflowExecutor executor, 
                                        String sessionId, 
                                        List<String> executionChain) {
        this.subWorkflowExecutor = executor;
        this.currentSessionId = sessionId;
        this.executionChain = executionChain;
    }
    
    @Override
    public void exec(Map<String, Object> params, Map<String, Object> execInput) {
        try {
            // 循环依赖检查
            if (subWorkflowExecutor.hasCircularDependency(
                    subWorkflow.getIdentity(), executionChain)) {
                throw new CheckedException("检测到循环依赖");
            }
            
            // 🎯 关键：通过接口调用
            Map<String, Object> result = subWorkflowExecutor.executeSubWorkflow(
                subWorkflow.getIdentity(), execInput, currentSessionId);
            
            endNodeExec(result, ExecStatus.SUCCESS, null);
        } catch (Exception e) {
            endNodeExec(null, ExecStatus.FAILED, e.getMessage());
        }
    }
}

// DirectedGraph注入依赖
public class DirectedGraph {
    @Autowired
    private SubWorkflowExecutor subWorkflowExecutor;
    
    public Map<String, Object> executeWorkflow(...) {
        List<String> executionChain = buildExecutionChain(execId);
        
        while (!queue.isEmpty()) {
            Node node = queue.poll();
            
            // 🎯 关键：为WorkflowNode注入执行依赖
            if (node instanceof WorkflowNode) {
                WorkflowNode workflowNode = (WorkflowNode) node;
                workflowNode.setExecutionDependencies(
                    subWorkflowExecutor, sessionId, executionChain);
            }
            
            node.exec(params, execInput);
        }
    }
}
```

### ✅ 优势

- **实现简单**：最少的代码改动，快速实现
- **接口隔离**：依赖接口而非具体实现，降低耦合
- **易于理解**：概念直观，学习成本低
- **向后兼容**：对现有代码影响最小

### ❌ 劣势

- **架构妥协**：Model层仍然调用业务逻辑
- **依赖注入**：需要运行时手动注入依赖
- **测试复杂**：需要Mock接口依赖

------

## 三种方案对比

| 对比维度       | 委托模式 | 工厂模式 | 接口隔离 |
| -------------- | -------- | -------- | -------- |
| **实现复杂度** | 🟡 中等   | 🔴 高     | 🟢 低     |
| **架构纯净度** | 🟢 高     | 🟢 高     | 🟡 中等   |
| **扩展性**     | 🟡 一般   | 🟢 很好   | 🟡 一般   |
| **维护成本**   | 🟡 中等   | 🟡 中等   | 🟢 低     |
| **学习成本**   | 🟡 中等   | 🔴 高     | 🟢 低     |
| **测试友好**   | 🟡 一般   | 🟢 好     | 🟡 一般   |
| **开发速度**   | 🟡 中等   | 🔴 慢     | 🟢 快     |
| **嵌套支持**   | 🟢 好     | 🟢 很好   | 🟢 好     |
