---
title: CGLIB动态代理
pubDate: 2024-04-19
categories: ["技术","Java基础","代理机制","动态代理"]
description: "本文深入介绍了 Java 中基于 CGLIB 的动态代理机制，涵盖了其基本使用方法、原理剖析以及与 JDK 动态代理的对比。通过实际代码演示，展示了如何使用 CGLIB 为无接口的类创建代理对象，并实现对方法调用的增强。同时，通过 MethodInterceptor 和 CallbackFilter 实现多拦截器链路的控制逻辑。最后总结了 JDK 与 CGLIB 动态代理在使用方式、生成类结构、底层实现和执行流程等方面的核心区别，帮助读者全面掌握动态代理技术在 Java 开发中的应用场景和底层逻辑。"
---
# CGLIB动态代理

# 基本使用

maven引入CGLIB包，然后编写一个UserDao类，它没有接口，只有两个方法，select() 和 update()

```java
public class UserDao {
    public void select() {
        System.out.println("UserDao 查询 selectById");
    }
    public void update() {
        System.out.println("UserDao 更新 update");
    }
}
```

编写一个 LogInterceptor ，继承了 MethodInterceptor，用于方法的拦截回调

```java
import java.lang.reflect.Method;
import java.util.Date;

public class LogInterceptor implements MethodInterceptor {
    /**
     * @param object 表示要进行增强的对象
     * @param method 表示拦截的方法
     * @param objects 数组表示参数列表，基本数据类型需要传入其包装类型，如int-->Integer、long-Long、double-->Double
     * @param methodProxy 表示对方法的代理，invokeSuper方法表示对被代理对象方法的调用
     * @return 执行结果
     * @throws Throwable
     */
    @Override
    public Object intercept(Object object, Method method, Object[] objects, MethodProxy methodProxy) throws Throwable {
        before();
        Object result = methodProxy.invokeSuper(object, objects);   // 注意这里是调用 invokeSuper 而不是 invoke，否则死循环，methodProxy.invokesuper执行的是原始类的方法，method.invoke执行的是子类的方法
        after();
        return result;
    }
    private void before() {
        System.out.println(String.format("log start time [%s] ", new Date()));
    }
    private void after() {
        System.out.println(String.format("log end time [%s] ", new Date()));
    }
}
```

测试

```java
import net.sf.cglib.proxy.Enhancer;

public class CglibTest {
    public static void main(String[] args) {
        DaoProxy daoProxy = new DaoProxy(); 
        Enhancer enhancer = new Enhancer();
        enhancer.setSuperclass(Dao.class);  // 设置超类，cglib是通过继承来实现的
        enhancer.setCallback(daoProxy);

        Dao dao = (Dao)enhancer.create();   // 创建代理类
        dao.update();
        dao.select();
    }
}
```

运行结果

```java
log start time [Fri Dec 21 00:06:40 CST 2018] 
UserDao 查询 selectById
log end time [Fri Dec 21 00:06:40 CST 2018] 
log start time [Fri Dec 21 00:06:40 CST 2018] 
UserDao 更新 update
log end time [Fri Dec 21 00:06:40 CST 2018] 
```

还可以进一步多个 MethodInterceptor 进行过滤筛选

```java
public class LogInterceptor2 implements MethodInterceptor {
    @Override
    public Object intercept(Object object, Method method, Object[] objects, MethodProxy methodProxy) throws Throwable {
        before();
        // method.invoke(o, objects);是错的 因为o是代理对象 如果在这个类里面传入一个被代理对象替代o就可以
        Object result = methodProxy.invokeSuper(object, objects);
        after();
        return result;
    }
    private void before() {
        System.out.println(String.format("log2 start time [%s] ", new Date()));
    }
    private void after() {
        System.out.println(String.format("log2 end time [%s] ", new Date()));
    }
}

// 回调过滤器: 在CGLib回调时可以设置对不同方法执行不同的回调逻辑，或者根本不执行回调。
public class DaoFilter implements CallbackFilter {
    @Override
    public int accept(Method method) {
        if ("select".equals(method.getName())) {
            return 0;   // Callback 列表第1个拦截器
        }
        return 1;   // Callback 列表第2个拦截器，return 2 则为第3个，以此类推
    }
}
```

再次测试

```java
public class CglibTest2 {
    public static void main(String[] args) {
        LogInterceptor logInterceptor = new LogInterceptor();
        LogInterceptor2 logInterceptor2 = new LogInterceptor2();
        Enhancer enhancer = new Enhancer();
        enhancer.setSuperclass(UserDao.class);   // 设置超类，cglib是通过继承来实现的
        enhancer.setCallbacks(new Callback[]{logInterceptor, logInterceptor2, NoOp.INSTANCE});   // 设置多个拦截器，NoOp.INSTANCE是一个空拦截器，不做任何处理
        enhancer.setCallbackFilter(new DaoFilter());

        UserDao proxy = (UserDao) enhancer.create();   // 创建代理类
        proxy.select();
        proxy.update();
    }
}	
```

运行结果

```java
log start time [Fri Dec 21 00:22:39 CST 2018] 
UserDao 查询 selectById
log end time [Fri Dec 21 00:22:39 CST 2018] 
log2 start time [Fri Dec 21 00:22:39 CST 2018] 
UserDao 更新 update
log2 end time [Fri Dec 21 00:22:39 CST 2018] 
```

CGLIB 创建动态代理类的模式是：

1. 查找目标类上的所有非final 的public类型的方法定义；
2. 将这些方法的定义转换成字节码；
3. 将组成的字节码转换成相应的代理的class对象；
4. 实现 MethodInterceptor接口，用来处理对代理类上所有方法的请求

## 实现原理

[可以看这篇文章的实现](https://www.cnblogs.com/zwwhnly/p/17340026.html)

简单来说Enhancer会主要生成三个类`Coder$$EnhancerByCGLIB$$8e91f654.class`，`Coder$$EnhancerByCGLIB$$8e91f654$$FastClassByCGLIB$$4e5eb5aa.class`，`Coder$$FastClassByCGLIB$$398819d0.class`。分别是代理类，代理类的索引类和被代理类的索引类。我们调用代理类的对应方法，首先会调用我们设置的继承了MethodInterceptor类的interceptor方法。然后再`invokeSuper`方法，在这个方法中`init`初始化了代理类的索引类和被代理类的索引类。然后调用代理类索引类的对应方法，根据初始化好的index，在调用我们代理类的方法，最后就是调用父类的方法。

代理类--->自定义方法拦截器--->代理类索引类getIndex()方法-->代理类索引类invoke()方法--->代理类--->被代理类。

## 4. JDK动态代理与CGLIB动态代理区别（面试常问）

了解了JDK动态代理和CGLIB动态代理的原理后，现在来比较下两者的区别，这也是面试时几乎必问的一道面试题。

1. 使用JDK动态代理，被代理类必须要实现接口，使用CGLIB动态代理，被代理类可以不实现接口

   > 原因分析：
   >
   > **JDK动态代理**生成的代理类继承了`java.lang.reflect.Proxy`，因为Java是单继承的，如果不通过实现接口的形式，
   >
   > 无法对类进行扩展。
   >
   > **CGLIB动态代理**生成的代理类实际上是被代理类的子类，所以被代理类可以不实现接口。

2. 自动生成类的数量不同

   > **JDK动态代理**只会生成1个代理类，一般情况下名称为：`com.sun.proxy.$Proxy0`。
   >
   > **CGLIB动态代理**会生成好几个类，核心的3个分别是：
   >
   > 1)代理类：被代理类的子类，名称格式为`Coder$$EnhancerByCGLIB$$8e91f654`，包名和被代理类包名一致。
   >
   > 2)代理类的索引类：名称格式为`Coder$$EnhancerByCGLIB$$8e91f654$$FastClassByCGLIB$$4e5eb5aa`，
   >
   > 包名和被代理类包名一致。
   >
   > 3)被代理类的索引类：名称格式为`Coder$$FastClassByCGLIB$$398819d0`，包名和被代理类包名一致。

3. 生成代理类技术不同

   > **JDK动态代理**使用JDK自带的ProxyGenerator类生成字节码文件。
   >
   > **CGLIB动态代理**使用ASM框架生成字节码文件。

4. 调用方式不同

   > **JDK动态代理**：代理类--->InvocationHandler.invoke()--->被代理类方法（用到了反射）。
   >
   > **CGLIB动态代理**：代理类--->MethodInterceptor.intercept()--->代理类索引类getIndex()--->
   >
   > 代理类索引类invoke()--->代理类--->被代理类。（直接调用）
