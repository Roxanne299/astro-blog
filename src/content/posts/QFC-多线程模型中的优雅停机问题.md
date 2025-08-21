---
title: QFC-多线程模型中的优雅停机问题
pubDate: 2025-07-10
categories: ["技术","多线程","优雅停机"]
description: "之前在阅读AQS相关源码中，对于阻塞队列中唤醒处理interpret中断的实际意义有疑问。今天在QFC培训的时候摸底考试添加优雅停机的时候对这个概念有了更深的认识。"
---

# 线程优雅停机

## 优雅停机——阻塞队列与信号量结合的线程优雅退出

### 1. 题目背景

在多线程场景下，经常会遇到「生产者-消费者模型」：生产者不断往队列中写入任务，消费者从队列中取任务并执行。本次练习要求：

- 生产者通过命令行读取货物的运输时间（ms）。
- 使用 3 个快递员（消费者）线程并发投递。
- 队列容量为 3，当队列已满时拒绝新输入。
- 支持用户输入 `q` 时优雅退出整个程序。

原始实现中，消费者线程持续执行 `while(true)`，并且在 `semaphore.acquire()` 与 `queue.poll()` 上可能长时间阻塞，导致退出命令无法及时响应。

------

### 2. 原始代码示例

```java
// DeliveryMachine.java（原始版）
public class DelivoryMachine implements Runnable {
    private LinkedBlockingQueue<Delivery> queue;
    private Semaphore semaphore;

    public DelivoryMachine(LinkedBlockingQueue<Delivery> queue, Semaphore semaphore) {
        this.queue = queue;
        this.semaphore = semaphore;
    }

    @Override
    public void run() {
        while (true) {
            if (semaphore.tryAcquire()) {
                Delivery task = queue.poll(10, TimeUnit.MINUTES);
                new Thread(task).start();
            }
        }
    }
}
// Main.java（原始版）
public class Main {
    public static void main(String[] args) throws IOException {
        Semaphore semaphore = new Semaphore(3);
        LinkedBlockingQueue<Delivery> queue = new LinkedBlockingQueue<>(3);
        new Thread(new DelivoryMachine(queue, semaphore)).start();
        
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line;
        while (!(line = br.readLine()).equals("q")) {
            // 省略输入校验...
            queue.offer(new Delivery(Integer.parseInt(line), semaphore));
        }
    }
}
```

**问题点**：

1. `while(true)` 无退出条件；
2. `semaphore.tryAcquire()` 与 `queue.poll()` 分别阻塞／超时后不够及时；
3. 未处理线程中断，导致输入 `q` 后程序无法快速停止。

------

### 3. 优雅停机改进方案

改进思路：

1. 增加 `volatile boolean running` 标志，控制循环退出；
2. 在主线程输入 `q` 后，调用 `shutdown()` 设置 `running = false`；
3. 通过 `thread.interrupt()` 打断消费者线程在 `acquire()` 或 `poll()` 上的阻塞，立即触发 `InterruptedException`；
4. 在 `catch` 中根据 `running` 判断是否退出循环。

#### 改进后的 DeliveryMachine.java

```java
public class DeliveryMachine implements Runnable {
    private volatile boolean running = true;
    private final BlockingQueue<Delivery> queue;
    private final Semaphore semaphore;

    public DeliveryMachine(BlockingQueue<Delivery> queue, Semaphore semaphore) {
        this.queue = queue;
        this.semaphore = semaphore;
    }

    public void shutdown() {
        running = false;
    }

    @Override
    public void run() {
        while (running || !queue.isEmpty()) {
            try {
                semaphore.acquire();
                Delivery task = queue.poll(1, TimeUnit.SECONDS);
                if (task == null) {
                    semaphore.release();
                    continue;
                }
                new Thread(() -> {
                    try { task.run(); }
                    finally { semaphore.release(); }
                }).start();
            } catch (InterruptedException e) {
                if (!running) break;
            }
        }
    }
}
```

#### 改进后的 Main.java

```java
public class Main {
    public static void main(String[] args) throws IOException, InterruptedException {
        Semaphore semaphore = new Semaphore(3);
        BlockingQueue<Delivery> queue = new LinkedBlockingQueue<>(3);

        DeliveryMachine machine = new DeliveryMachine(queue, semaphore);
        Thread machineThread = new Thread(machine, "DeliveryMachine");
        machineThread.start();

        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line;
        System.out.println("输入 q 退出：");
        while ((line = br.readLine()) != null) {
            if ("q".equalsIgnoreCase(line.trim())) break;
            // 校验并入队...
        }

        machine.shutdown();
        machineThread.interrupt();
        machineThread.join();
        System.out.println("程序已优雅退出");
    }
}
```

------

### 4. 总结

通过 `shutdown + interrupt` 的组合：

- **`shutdown()`**：从业务层面告诉线程“别再接新任务了”；
- **`interrupt()`**：物理层面打断阻塞，线程立即抛出 `InterruptedException`，快速检测到退出信号。

两者配合，既能完成正在处理的任务，又能快速响应退出指令，避免线程长时间挂起，提高程序健壮性与可维护性。
