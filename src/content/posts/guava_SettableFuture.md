---
title: Guava源码-SettableFuture
pubDate: 2025-07-20
categories: ["技术","guava","SettableFuture"]
description: "在并发编程中，`Future` 是我们常用的一种异步结果获取机制，但其原生实现在灵活性上存在一定限制，例如无法主动设置结果、添加回调、级联等待等。为了解决这些痛点，Google Guava 提供了功能更强大的 `ListenableFuture` 和其可手动控制的实现类 `SettableFuture`。`SettableFuture` 允许开发者在未来任意时刻主动设置计算结果（或异常），并支持注册回调、级联联动、取消传播等高级特性，极大增强了异步任务的表达能力。在底层，它依赖于抽象类 `AbstractFuture` 实现复杂的状态管理、监听机制、等待队列等逻辑。本文将深入分析 `SettableFuture` 的源码实现，结合流程图系统性地讲解 `set`、`get`、`cancel`、`setFuture`、`complete` 等核心方法的执行流程与线程安全设计，帮助读者建立对其并发机制的整体理解。"
---
# Guava源码-SettableFuture

## 前言

​	在并发编程中，`Future` 是我们常用的一种异步结果获取机制，但其原生实现在灵活性上存在一定限制，例如无法主动设置结果、添加回调、级联等待等。为了解决这些痛点，Google Guava 提供了功能更强大的 `ListenableFuture` 和其可手动控制的实现类 `SettableFuture`。`SettableFuture` 允许开发者在未来任意时刻主动设置计算结果（或异常），并支持注册回调、级联联动、取消传播等高级特性，极大增强了异步任务的表达能力。在底层，它依赖于抽象类 `AbstractFuture` 实现复杂的状态管理、监听机制、等待队列等逻辑。

​	本文将深入分析 `SettableFuture` 的源码实现，结合流程图系统性地讲解 `set`、`get`、`cancel`、`setFuture`、`complete` 等核心方法的执行流程与线程安全设计，帮助读者建立对其并发机制的整体理解。

## ListenableFuture 类结构简析

​	从 UML 图可以看出，`SettableFuture` 是 `ListenableFuture` 接口的一个重要实现类，它继承自抽象基类 `AbstractFuture`。整个体系的核心逻辑，如状态管理、线程阻塞、回调执行、取消传播等，**几乎都集中在 `AbstractFuture` 中实现**。

​	`SettableFuture` 本身只是对外暴露了一组用于手动控制异步结果的方法（如 `set()`、`setException()` 等），底层则完全依赖 `AbstractFuture` 提供的并发框架与机制。因此，**理解 `SettableFuture` 的本质，其实就是深入掌握 `AbstractFuture` 的实现细节与设计思想**。 

![img](https://cdn.jsdelivr.net/gh/Roxanne299/PictureBed//blog/(null))

## AbstractFuture类主要内部类

![img](https://cdn.jsdelivr.net/gh/Roxanne299/PictureBed//blog/(null)-20250720174356687.(null))

| 内部类             | 作用简介                                                     |
| ------------------ | ------------------------------------------------------------ |
| SynchronizedHelper | 线程安全保障的“悲观锁”实现（用 synchronized 保证原子性，兼容性最好，但效率一般，仅在底层CAS不可用时作为兜底） |
| SafeAtomicHelper   | 用 AtomicReferenceFieldUpdater 实现的CAS原子操作类，通常用于大部分JVM环境下，性能好，推荐主力实现 |
| UnsafeAtomicHelper | 用 sun.misc.Unsafe 实现的极致性能版本CAS（需要特殊权限），在支持 Unsafe 的JVM上会优先用它 |
| AtomicHelper       | 以上三种 Helper 的抽象父类（模板），声明了原子操作接口，具体用哪个由静态代码块在类加载时自动选择 |
| SetFuture          | 用于 setFuture 语义的“占位任务”，内部封装对另一个Future的依赖，完成级联/转发（Runnable） |
| Cancellation       | 用于记录取消操作的特殊状态对象，带有中断标志、可传递取消原因（包装了取消状态） |
| Failure            | 用于记录 Future 执行过程中出现的异常结果（包装 Throwable），实现异常完成语义 |
| Listener           | 存放所有回调任务（Runnable+Executor）的链表节点，支持注册、批量回调 |
| Waiter             | 存放所有调用 get() 等待的线程的链表节点，实现阻塞等待与唤醒  |
| TrustedFuture      | “可信”Future的标识类（优化某些特殊 Future 的判等/状态），很少外部接触，支持使用自身封装的cas操作可信类的底层数据 |

## AbstractFuture核心数据结构

### listeners

`private volatile @Nullable Listener listeners;`：添加的监听器

* 状态1: Future 未完成（listeners 正常挂载中）

  ![Listener状态1](https://cdn.jsdelivr.net/gh/Roxanne299/PictureBed//blog/202507201920412.png)

  * 每个 `Listener` 由 `(Runnable task, Executor executor)` 构成。
  * 是一个典型的“头插链表”，新加的 Listener 在最前面。
  * 当 future 没有完成时，调用 `addListener()` 会继续往这个链表插入新节点。

* 状态2: Future 已完成（listeners 被清空 → TOMBSTONE）

  ![listener状态2](https://cdn.jsdelivr.net/gh/Roxanne299/PictureBed//blog/202507201923456.png)

  * `complete()` 中会调用 `clearListeners()`，将 listeners 链表返回并置为 `TOMBSTONE`。
  * `TOMBSTONE` 是一个固定哨兵节点（常量对象）。
  * 此时再调用 `addListener()` 不会加入链表，而是**立即执行该 listener**。

### waiters

`private volatile @Nullable Waiter waiters;`：调用了get等待的线程

- 状态1: Future 未完成，Waiter 链表正常挂载中

  ![Waiters状态1](https://cdn.jsdelivr.net/gh/Roxanne299/PictureBed//blog/202507201928538.png)

  * 每个 `Waiter` 包含一个 `Thread` 和一个 `next` 指针。
  * 被阻塞线程会依次挂入此链表（头插法）。
  * 这些线程通过 `LockSupport.park()` 挂起，等待唤醒。

- 状态2: Future 完成后，Waiter 链表被清空并置为 `TOMBSTONE`

  ![Waiters状态2](https://cdn.jsdelivr.net/gh/Roxanne299/PictureBed//blog/image-20250720193110659.png)

  * `complete()` 方法中调用 `releaseWaiters()`：
    * 首先将 `waiters` 设置为 `TOMBSTONE`。
    * 然后从旧链表中取出每个 `Waiter`，调用 `LockSupport.unpark()` 唤醒。

### SetFuture

SetFuture其实就是一个future级联器，假设你有 A 和 B 两个 `SettableFuture`，你想让 A 的结果自动等于 B 的结果，无论 B 最后是成功还是失败、取消、超时。用 Guava 通常这样做：

```java
SettableFuture<String> futureA = SettableFuture.create();
SettableFuture<String> futureB = SettableFuture.create();
futureA.setFuture(futureB);
```

**效果：**

- 当 `futureB.set("hello")`，`futureA` 也会返回 "hello"。
- 当 `futureB.setException(new RuntimeException())`，`futureA` 也会抛出异常。
- 当 `futureB.cancel(true)`，`futureA` 也会被取消。

**本质就是结果“级联”。**

**实现原理**

​	`SetFuture` 是 `AbstractFuture` 的一个私有静态内部类，实现了 `Runnable` 接口，用于支持 `setFuture()` 方法中的 **级联 Future 绑定**。

* `owner`: 当前 SetFuture 所附着的 `AbstractFuture` 实例，即最终要设置结果的目标。
* `future`: 另一个 `ListenableFuture` 实例，即提供实际结果的源。

> **`SetFuture` 是 `setFuture()` 操作的桥梁类，封装了对另一个 `ListenableFuture` 的监听关系，一旦 `future` 完成，它会将其结果传递给 `owner`，完成级联设置。**

```java
private static final class SetFuture<V> implements Runnable {
    // futureA就是owner
    final AbstractFuture<V> owner;
    // futureB就是future
    final ListenableFuture<? extends V> future;

    SetFuture(AbstractFuture<V> owner, ListenableFuture<? extends V> future) {
        this.owner = owner;
        this.future = future;
    }

    public void run() {
        // 这里是判断状态是否改变
        if (this.owner.value == this) {
              // 获取我们当前future的set值
            Object valueToSet = AbstractFuture.getFutureValue(this.future);
            // 将我们owner.value设置为valueToSet
            if (AbstractFuture.ATOMIC_HELPER.casValue(this.owner, this, valueToSet)) {
            // 完成了owner
                AbstractFuture.complete(this.owner);
           }
        }
    }
}
```

## AbstractFuture核心方法

### setFuture方法

​	`setFuture` 方法用于将当前 `AbstractFuture` 的结果**绑定到另一个 `ListenableFuture` 上**，实现结果级联转发。它允许当前 Future 不再主动设置结果，而是**监听另一个 Future 的完成状态**，并自动复制其结果（成功、失败或取消）。

#### 方法核心要点：

- **空指针检查**：不允许传入 `null`。
- **立即完成优化**：若传入的 Future 已完成，立即提取结果并尝试设置。
- **结果级联机制**：未完成则构造 `SetFuture`，注册监听回调，等待目标完成。
- **CAS 保证并发安全**：所有状态变更都通过 CAS 操作确保原子性。
- **异常感知**：监听注册失败也会设置失败状态，保证鲁棒性。
- **取消同步**：若当前 Future 已取消，则同步取消目标 Future。

该方法是实现 **Future 组合/级联逻辑的关键基础设施**，Guava 的很多异步工具（如 `Futures.transform()`）都依赖此机制构建响应式链式流程。其中实现逻辑的流程图和代码如下所示：

![setFuture方法流程图](https://cdn.jsdelivr.net/gh/Roxanne299/PictureBed//blog/202507202000513.png)

```java
protected boolean setFuture(ListenableFuture<? extends V> future) {
    Preconditions.checkNotNull(future);
    Object localValue = this.value;
    if (localValue == null) {
        //如果当前传入的future已经完成了那么就 将当前value值设置成localValue
        if (future.isDone()) {
            Object value = getFutureValue(future);
            if (ATOMIC_HELPER.casValue(this, (Object)null, value)) {
                complete(this);
                return true;
            }
            // 设置不成功就返回失败
            return false;
        }

        // 否则就将我们的value设置成SetValue
        SetFuture valueToSet = new SetFuture(this, future);
        if (ATOMIC_HELPER.casValue(this, (Object)null, valueToSet)) {
            try {
                // 将我们的Setfuture作为future的监听器Runnable  执行器也就是当前线程（是执行set的当前线程）
                future.addListener(valueToSet, DirectExecutor.INSTANCE);
            } catch (Throwable var8) {
                Throwable t = var8;

                Failure failure;
                try {
                    failure = new Failure(t);
                } catch (Throwable var7) {
                    failure = AbstractFuture.Failure.FALLBACK_INSTANCE;
                }
                // 失败了就是setvalue为失败的

                ATOMIC_HELPER.casValue(this, valueToSet, failure);
            }

            return true;
        }

        localValue = this.value;
    }

    if (localValue instanceof Cancellation) {
        future.cancel(((Cancellation)localValue).wasInterrupted);
    }

    return false;
}
```

### get方法

`get()` 方法用于**同步获取 Future 的最终结果**。如果结果尚未完成，当前线程将进入阻塞状态，直到任务完成、被取消或发生中断。

#### 核心行为说明：

- **阻塞点依赖的核心变量是 `value` 字段**：
   当 `value` 为 `null` 或 `SetFuture` 时，说明结果尚未完成，线程需要等待。
- **阻塞机制基于 `Waiter` 链表 + `LockSupport.park()`：**
   调用 `get()` 的线程会被封装为一个 `Waiter` 节点，插入等待链表，然后被挂起。
- **线程唤醒时机：**
   一旦 `value` 被设置为非 `null` 且非 `SetFuture`，线程会被唤醒，调用 `getDoneValue(value)` 返回结果或抛出异常。
- **支持中断响应：**
   如果线程在挂起期间被中断，会立即移除自己在 `waiters` 链表中的节点并抛出 `InterruptedException`。

其中实现逻辑的流程图和代码如下所示：

![get方法流程图](https://cdn.jsdelivr.net/gh/Roxanne299/PictureBed//blog/202507201827886.png)

```java
public V get() throws InterruptedException, ExecutionException {
    if (Thread.interrupted()) {
        throw new InterruptedException();
    } else {
        Object localValue = this.value;
        // 如果还没有set或者set是等待另一个setfuture 那就说明还没完成
        if (localValue != null & !(localValue instanceof SetFuture)) {
            // 返回对应的值
            return (V)this.getDoneValue(localValue);
        } else {
            // 否则就把当前执行get的线程插入到等待队列中阻塞
            Waiter oldHead = this.waiters;
            // 如果当前的头结点不是墓碑节点
            // 墓碑节点（TOMBSTONE）只在Future完成时才会作为waiters链表的特殊标记。
            if (oldHead != AbstractFuture.Waiter.TOMBSTONE) {
                
                Waiter node = new Waiter();

                do {
                    node.setNext(oldHead);
                    // 将头结点设置成当前节点
                    if (ATOMIC_HELPER.casWaiters(this, oldHead, node)) {
                        do {
                           // 挂起
                            LockSupport.park(this);
                            if (Thread.interrupted()) {
                                this.removeWaiter(node);
                                throw new InterruptedException();
                            }

                            localValue = this.value;
                            // 被唤醒之后也得有value才可以跳出while
                        } while(!(localValue != null & !(localValue instanceof SetFuture)));

                        return (V)this.getDoneValue(localValue);
                    }

                    oldHead = this.waiters;
                } while(oldHead != AbstractFuture.Waiter.TOMBSTONE);
            }
            
            return (V)this.getDoneValue(this.value);
        }
    }
}
```

`getDoneValue`方法会根据get返回的值来抛出异常 (这也是为什么`get`方法只抛出`ExecutionException`和`InterruptedException`)：

```java
private V getDoneValue(Object obj) throws ExecutionException {
    if (obj instanceof Cancellation) {
        throw cancellationExceptionWithCause("Task was cancelled.", ((Cancellation)obj).cause);
    } else if (obj instanceof Failure) {
        throw new ExecutionException(((Failure)obj).exception);
    } else if (obj == NULL) {
        return null;
    } else {
        V asV = obj;
        return asV;
    }
}
```

### set方法

`set()` 方法是 `SettableFuture` 提供的核心能力之一，允许**显式地为 Future 设置一个正常完成的结果**，从而触发状态转变与所有回调执行。

#### 核心行为说明：

- **设置目标字段是 `value`：**
   `value` 字段是 `AbstractFuture` 的状态载体，`set()` 方法通过 CAS 将其从 `null` 更新为用户提供的值（或内部标识 `NULL`）。
- **并发保证：**
   设置操作使用 `ATOMIC_HELPER.casValue()` 保证线程安全，确保只允许第一次成功设置。
- **成功后触发 `complete()`：**
   一旦设置成功，会调用 `complete(this)`：
  - 唤醒所有通过 `get()` 阻塞的线程（`releaseWaiters()`）。
  - 执行所有注册的监听器回调（`clearListeners()`）。
- **失败场景：**
   如果设置失败（可能是已经被 `setFuture`、`setException` 或 `cancel` 占用），方法会返回 `false`，表示设置未生效。

```java
protected boolean set(@Nullable V value) {
    Object valueToSet = value == null ? NULL : value;
    // CAS操作给value赋值
    if (ATOMIC_HELPER.casValue(this, (Object)null, valueToSet)) {
        complete(this);
        return true;
    } else {
        return false;
    }
}
```

### **complete方法**

`complete`方法简单理解就是完成`future`所有需要完成的“后事儿”。

#### 核心行为说明：

- **唤醒等待线程：**
  - 调用 `releaseWaiters()` 方法，将 `waiters` 链表设置为 `TOMBSTONE`，并使用 `LockSupport.unpark()` 逐一唤醒被 `get()` 挂起的线程。
- **执行监听器回调：**
  - 调用 `clearListeners()` 方法将 `listeners` 链表清空（设置为 `TOMBSTONE`），并倒序执行所有已注册的 `Runnable`。
  - 如果监听器是 `SetFuture` 类型，则转发其结果并递归触发下一级 `complete()`。

![complete方法流程图](https://cdn.jsdelivr.net/gh/Roxanne299/PictureBed//blog/202507201840863.png)

```java
private static void complete(AbstractFuture<?> future) {
    Listener next = null;
    label23:
    while(true) {
        // 释放那些因为get方法阻塞的等待线程
        future.releaseWaiters();
        // 钩子方法 用于后续实现一些需要在set之后完成的逻辑
        future.afterDone();
        // 这里返回的是一个reverseList 也就是倒叙的监听器链表
        next = future.clearListeners(next);
        AbstractFuture<?> var6 = null;

        while(next != null) {
            Listener curr = next;
            next = next.next;
            Runnable task = curr.task;
            // 如果当前监听器的任务是一个SetFuture 也就是依赖于另外的值     
            if (task instanceof SetFuture) {
                SetFuture<?> setFuture = (SetFuture)task;
                future = setFuture.owner;
                // 如果状态没问题 
                if (future.value == setFuture) {
                    // 获取我们级联等待的value然后将他的值设置给我们的future
                    Object valueToSet = getFutureValue(setFuture.future);
                    if (ATOMIC_HELPER.casValue(future, setFuture, valueToSet)) {
                        continue label23;
                    }
                }
            } else {
                // 执行监听器 
                executeListener(task, curr.executor);
            }
        }

        return;
    }
}
```

**releaseWaiters方法**

`complete`方法通过`releaseWaiters`方法执行所有注册过的监听器，需要注意这里面执行的顺序是根据添加的监听器顺序进行执行的。

```java
private void releaseWaiters() {
    Waiter head;
    do {
      //将等待链表赋值给head 
        head = this.waiters;
        // 将原来的链表设置成“墓碑” 代表已经释放完了
    } while(!ATOMIC_HELPER.casWaiters(this, head, AbstractFuture.Waiter.TOMBSTONE));

    for(Waiter currentWaiter = head; currentWaiter != null; currentWaiter = currentWaiter.next) {
        // 轮询唤醒
        currentWaiter.unpark();
    }

}
```

### addListener方法

`addListener()` 用于**注册一个在 Future 完成时执行的回调任务**。这是 Guava 的 `ListenableFuture` 相较于原生 `Future` 的主要增强特性之一。

#### 核心行为说明：

- **参数结构：**
  - 接收一个 `Runnable` 和一个 `Executor`，组合形成一个监听器节点（Listener）。
- **执行时机判断：**
  - 若当前 Future **尚未完成**（`value == null || value instanceof SetFuture`），则将监听器以**头插法**加入 `listeners` 链表中，等待后续 `complete()` 时执行。
  - 若当前 Future **已完成**（`listeners == TOMBSTONE`），则**立即通过指定 Executor 执行 listener**，不再加入链表。
- **线程安全：**
  - 监听器链表添加操作通过 `ATOMIC_HELPER.casListeners()` 保证原子性，避免并发插入冲突。

```java
public void addListener(Runnable listener, Executor executor) {
    // 常规检查 检查传入的线程和执行器不能为空
    Preconditions.checkNotNull(listener, "Runnable was null.");
    Preconditions.checkNotNull(executor, "Executor was null.");
    // 只有在当前future没有set的情况下进行添加监听器
    if (!this.isDone()) {
        // 获取监听器链头 头插法
        Listener oldHead = this.listeners;
        if (oldHead != AbstractFuture.Listener.TOMBSTONE) {
            Listener newNode = new Listener(listener, executor);

            do {
                newNode.next = oldHead;
                if (ATOMIC_HELPER.casListeners(this, oldHead, newNode)) {
                    return;
                }

                oldHead = this.listeners;
            } while(oldHead != AbstractFuture.Listener.TOMBSTONE);
        }
    }

    executeListener(listener, executor);
}
```

### cancel方法

`cancel()` 方法是 `AbstractFuture` 中最复杂也最关键的控制逻辑之一，用于**中止一个未完成的 Future，并传播取消信号到依赖链条上**，确保线程安全地更新状态、唤醒等待线程并触发监听器回调。

#### 核心行为说明：

- **状态判断与 CAS 设置：**
  - 仅当当前 Future 的 `value` 为 `null` 或 `SetFuture` 时才允许取消；
  - 使用 CAS 将 `value` 字段设置为一个 `Cancellation` 对象，封装了是否允许中断等信息。
- **中断钩子：**
  - 若参数 `mayInterruptIfRunning = true`，则调用 `interruptTask()` 方法（子类可自定义响应中断行为）。
- **完成流程触发：**
  - 调用 `complete()` 方法，唤醒所有阻塞线程并执行监听器，统一处理后续逻辑。
- **级联取消传播：**
  - 如果当前 Future 的 `value` 是 `SetFuture`，表示它依赖另一个 Future；
  - `cancel()` 会尝试同步取消被依赖的 `future`，确保取消信号在 Future 链上“传染式”传播。
- **线程安全保障：**
  - 所有状态变更都使用 `ATOMIC_HELPER` 中的 CAS 工具，避免并发问题。

![cancel方法](https://cdn.jsdelivr.net/gh/Roxanne299/PictureBed//blog/202507201850096.png)

```java
public boolean cancel(boolean mayInterruptIfRunning) {
    Object localValue = this.value;
    boolean rValue = false;
    // 看看我们当前的future是不是已经执行完毕了 执行完毕是不能取消的
    if (localValue == null | localValue instanceof SetFuture) {
    // 确定取消的原因
        Object valueToSet = GENERATE_CANCELLATION_CAUSES ? new Cancellation(mayInterruptIfRunning, new CancellationException("Future.cancel() was called.")) : (mayInterruptIfRunning ? AbstractFuture.Cancellation.CAUSELESS_INTERRUPTED : AbstractFuture.Cancellation.CAUSELESS_CANCELLED);
        AbstractFuture<?> abstractFuture = this;

        while(true) {
        // 将我们当前的值设置成取消标志
            while(!ATOMIC_HELPER.casValue(abstractFuture, localValue, valueToSet)) {
            // 设置失败的话存在：
            //            1. SetFuture  不进入循环
            //            2. cancel    直接退出
            //            3. setValue   直接退出
                localValue = abstractFuture.value;
                if (!(localValue instanceof SetFuture)) {
                    return rValue;
                }
            }
            // 之后是针对SetFuture的逻辑 能到这里一定是设置取消标志成功
            rValue = true;
            if (mayInterruptIfRunning) {
                abstractFuture.interruptTask();
            }
            // 唤醒所有的监听器和等待线程
            complete(abstractFuture);
            if (!(localValue instanceof SetFuture)) {
                break;
            }
            // 传递给级联的future一块儿cancel
            ListenableFuture<?> futureToPropagateTo = ((SetFuture)localValue).future;
            if (!(futureToPropagateTo instanceof Trusted)) {
                futureToPropagateTo.cancel(mayInterruptIfRunning);
                break;
            }
            // 如果是受信的类型 那么可以继续尝试直接CAS取消 
            AbstractFuture<?> trusted = (AbstractFuture)futureToPropagateTo;
            localValue = trusted.value;
            if (!(localValue == null | localValue instanceof SetFuture)) {
                break;
            }

            abstractFuture = trusted;
        }
    }

    return rValue;
} 
```

## 回顾问题

**为什么MoreExecutors.directExecutor()是调用set方法的线程执行listener？**

```java
public static Executor directExecutor() {
    return DirectExecutor.INSTANCE;
}
enum DirectExecutor implements Executor {
    INSTANCE;

    private DirectExecutor() {
    }

    public void execute(Runnable command) {
        command.run();
    }

    public String toString() {
        return "MoreExecutors.directExecutor()";
    }
}
```

因为当我们`complete`方法中`executeListener`，其实就是执行了`command.run()`，所以最终执行的就是当前线程。

## 总结（方法适用场景与使用建议）

### `set()`

> **用于：手动完成异步结果，适合主动控制完成时间点的场景**

🔧 **实际场景：**

- **线程池执行任务后手动回调结果：**

```java
SettableFuture<String> future = SettableFuture.create();
executor.submit(() -> {
    String result = doRemoteCall();
    future.set(result); // 任务成功后手动完成
});
```

- **某些异步框架中提供回调接口，需要开发者手动触发完成（如 Netty、WebSocket）：**

```java
channel.readAsync().addCallback(result -> future.set(result));
```

------

### `setFuture()`

> **用于：绑定另一个 Future 的结果，实现结果转发或逻辑拼接**

🔧 **实际场景：**

- **将某个 RPC 请求的结果绑定给上层调用者，起到“桥接”作用：**

```java
SettableFuture<Response> apiFuture = SettableFuture.create();
ListenableFuture<Response> rpcFuture = rpcClient.asyncCall(request);
apiFuture.setFuture(rpcFuture); // 级联绑定 RPC 调用结果
```

- **实现异步流程控制器，允许中间层不关心底层如何完成，只绑定即可：**

```java
public ListenableFuture<Result> fetchData() {
    SettableFuture<Result> controller = SettableFuture.create();
    controller.setFuture(remoteService.fetchRemoteData());
    return controller;
}
```

------

### `get()`

> **用于：同步获取异步结果，适合主控线程在必要时阻塞**

🔧 **实际场景：**

- **在测试或调试场景下，等待异步调用返回结果：**

```java
String result = future.get(); // 用于单元测试时等待结果返回
```

- **用于实现“最后收口”：多个异步任务汇总后，同步处理结果：**

```java
ListenableFuture<List<Data>> allData = Futures.allAsList(taskList);
List<Data> results = allData.get(); // 阻塞合并所有结果
```

⚠️ **建议仅用于子线程或明确控制的主流程中，避免在 UI 或主线程中调用以防死锁。**

------

### `cancel()`

> **用于：主动终止未完成的 Future，常见于超时、业务中断或资源回收**

🔧 **实际场景：**

- **实现超时机制：**

```java
SettableFuture<String> future = SettableFuture.create();

SCHEDULER.schedule(() -> future.cancel(true), 3, TimeUnit.SECONDS); // 超时取消

executor.execute(() -> {
    doSomething();
    if (!future.isCancelled()) {
        future.set("done");
    }
});
```

- **用户请求中途关闭，服务端取消耗时操作或转发任务：**

```java
if (userDisconnected) {
    future.cancel(true);
}
```

- **中断级联的任务（和 `setFuture` 配合使用）：**

```java
SettableFuture<String> parent = SettableFuture.create();
ListenableFuture<String> child = httpClient.requestAsync();
parent.setFuture(child);

// 若 parent 被 cancel，会自动 cancel child
parent.cancel(true);
```

------

### `addListener()`

> **用于：注册完成后的回调逻辑，常用于响应式或事件驱动场景**

🔧 **实际场景：**

- **构建链式异步流程，无需阻塞线程：**

```java
future.addListener(() -> {
    log.info("任务完成，可以继续处理！");
}, executor);
```

- **收集异步任务完成时的日志/埋点：**

```java
future.addListener(() -> reportToMonitoringSystem(future), MoreExecutors.directExecutor());
```


