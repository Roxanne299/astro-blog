---
title: 静态代理
pubDate: 2023-04-19
categories: ["技术","Java基础","代理机制","静态代理"]
description: "静态代理是一种常见的结构型设计模式，核心思想是通过代理类增强目标对象的功能，且在程序运行前代理类已确定。本篇文章通过简洁示例带你快速了解静态代理的原理、实现方式以及存在的局限性，为深入理解动态代理打下基础。"
---
# 静态代理

代理其实就是通过一个代理对象来增强我们的目标对象方法，达到最终的效果。如果**根据字节码的创建时机**来分类，可以分为静态代理和动态代理：

- 所谓**静态**也就是在**程序运行前**就已经存在代理类的**字节码文件**，代理类和真实主题角色的关系在运行前就确定了。
- 而动态代理的源码是在程序运行期间由**JVM**根据反射等机制**动态的生成**，所以在运行前并不存在代理类的字节码文件

**Subject（抽象主题角色）**：定义代理类和真实主题的公共对外方法，也是代理类代理真实主题的方法；

**RealSubject（真实主题角色**）：真正实现业务逻辑的类；

**Proxy（代理主题角色）**：用来代理和封装真实主题；

代理模式的结构比较简单，其核心是代理类，为了让客户端能够**一致性地对待**真实对象和代理对象，在代理模式中引入了抽象层



![代理模式类图](https://cdn.jsdelivr.net/gh/Roxanne299/PictureBed//blog/202407022217753.png)

我们先通过实例来学习静态代理，然后理解静态代理的缺点，再来学习本文的主角：动态代理

编写一个接口 UserService ，以及该接口的一个实现类 UserServiceImpl

```
public interface UserService {
    public void select();   
    public void update();
}

public class UserServiceImpl implements UserService {  
    public void select() {  
        System.out.println("查询 selectById");
    }
    public void update() {
        System.out.println("更新 update");
    }
}
```

我们将通过静态代理对 UserServiceImpl 进行功能增强，在调用 `select` 和 `update` 之前记录一些日志。写一个代理类 UserServiceProxy，代理类需要实现 UserService

```java
public class UserServiceProxy implements UserService {
    private UserService target; // 被代理的对象

    public UserServiceProxy(UserService target) {
        this.target = target;
    }
    public void select() {
        before();
        target.select();    // 这里才实际调用真实主题角色的方法
        after();
    }
    public void update() {
        before();
        target.update();    // 这里才实际调用真实主题角色的方法
        after();
    }

    private void before() {     // 在执行方法之前执行
        System.out.println(String.format("log start time [%s] ", new Date()));
    }
    private void after() {      // 在执行方法之后执行
        System.out.println(String.format("log end time [%s] ", new Date()));
    }
}
```

客户端测试

```java
public class Client1 {
    public static void main(String[] args) {
        UserService userServiceImpl = new UserServiceImpl();
        UserService proxy = new UserServiceProxy(userServiceImpl);

        proxy.select();
        proxy.update();
    }
}
```

输出

```
复制代码log start time [Thu Dec 20 14:13:25 CST 2018] 
查询 selectById
log end time [Thu Dec 20 14:13:25 CST 2018] 
log start time [Thu Dec 20 14:13:25 CST 2018] 
更新 update
log end time [Thu Dec 20 14:13:25 CST 2018] 
```

通过静态代理，我们达到了功能增强的目的，而且没有侵入原代码，这是静态代理的一个**优点**。

## 静态代理的缺点

虽然静态代理实现简单，且不侵入原代码，但是，当场景稍微复杂一些的时候，静态代理的缺点也会暴露出来。

1、 当需要代理多个类的时候，由于代理对象要实现与目标对象一致的接口，有两种方式：

- 只维护一个代理类，由这个代理类实现多个接口，但是这样就导致**代理类过于庞大**
- 新建多个代理类，每个目标对象对应一个代理类，但是这样会**产生过多的代理类**

2、 当接口需要增加、删除、修改方法的时候，目标对象与代理类都要同时修改，**不易维护**。




