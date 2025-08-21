---
title: JDK动态代理
pubDate: 2024-04-19
categories: ["技术","Java基础","代理机制","动态代理"]
description: "本文全面讲解了 Java 中基于 JDK 的动态代理实现方式，涵盖了从基本用法到底层原理的详尽分析。通过引入 InvocationHandler 和 Proxy，构建了一个日志增强案例，演示如何动态创建代理类并在方法调用前后添加自定义逻辑。随后，文章进一步反编译生成的代理类 $Proxy0，分析其结构和调用链路，清晰还原了从调用代理方法到实际执行 invoke() 方法的全过程。最后总结了 JDK 动态代理的关键实现机制与核心作用，为理解 Java 动态代理机制提供了清晰直观的实战与理论支持。"
---
# JDK动态代理

## 基本使用

DK动态代理主要涉及两个类：`java.lang.reflect.Proxy` 和 `java.lang.reflect.InvocationHandler`，我们仍然通过案例来学习

编写一个调用逻辑处理器 LogHandler 类，提供日志增强功能，并实现 InvocationHandler 接口；在 LogHandler 中维护一个目标对象，这个对象是被代理的对象（真实主题角色）；在 `invoke` 方法中编写方法调用的逻辑处理

```java
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.util.Date;

public class LogHandler implements InvocationHandler {
    Object target;  // 被代理的对象，实际的方法执行者

    public LogHandler(Object target) {
        this.target = target;
    }
    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        before();
        Object result = method.invoke(target, args);  // 调用 target 的 method 方法
        after();
        return result;  // 返回方法的执行结果
    }
    // 调用invoke方法之前执行
    private void before() {
        System.out.println(String.format("log start time [%s] ", new Date()));
    }
    // 调用invoke方法之后执行
    private void after() {
        System.out.println(String.format("log end time [%s] ", new Date()));
    }
}
```

编写客户端，获取动态生成的代理类的对象须借助 Proxy 类的 newProxyInstance 方法，具体步骤可见代码和注释

```java
import proxy.UserService;
import proxy.UserServiceImpl;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;

public class Client2 {
    public static void main(String[] args) throws IllegalAccessException, InstantiationException {
        // 设置变量可以保存动态代理类，默认名称以 $Proxy0 格式命名
        // System.getProperties().setProperty("sun.misc.ProxyGenerator.saveGeneratedFiles", "true");
        // 1. 创建被代理的对象，UserService接口的实现类
        UserServiceImpl userServiceImpl = new UserServiceImpl();
        // 2. 获取对应的 ClassLoader
        ClassLoader classLoader = userServiceImpl.getClass().getClassLoader();
        // 3. 获取所有接口的Class，这里的UserServiceImpl只实现了一个接口UserService，
        Class[] interfaces = userServiceImpl.getClass().getInterfaces();
        // 4. 创建一个将传给代理类的调用请求处理器，处理所有的代理对象上的方法调用
        //     这里创建的是一个自定义的日志处理器，须传入实际的执行对象 userServiceImpl
        InvocationHandler logHandler = new LogHandler(userServiceImpl);
        /*
		   5.根据上面提供的信息，创建代理对象 在这个过程中，
               a.JDK会通过根据传入的参数信息动态地在内存中创建和.class 文件等同的字节码
               b.然后根据相应的字节码转换成对应的class，
               c.然后调用newInstance()创建代理实例
		 */
        UserService proxy = (UserService) Proxy.newProxyInstance(classLoader, interfaces, logHandler);
        // 调用代理的方法
        proxy.select();
        proxy.update();
        
        // 保存JDK动态代理生成的代理类，类名保存为 UserServiceProxy
        // ProxyUtils.generateClassFile(userServiceImpl.getClass(), "UserServiceProxy");
    }
}
```

运行结果

```java
复制代码log start time [Thu Dec 20 16:55:19 CST 2018] 
查询 selectById
log end time [Thu Dec 20 16:55:19 CST 2018] 
log start time [Thu Dec 20 16:55:19 CST 2018] 
更新 update
log end time [Thu Dec 20 16:55:19 CST 2018] 
```

## 主要原理

下面是Proxy#newProxyInstance的源码，写注释的地方就是我们要关注的地方，下面是别人的例子，别人代理的类是Subject，使用的方法是doLogin。

```java
 @CallerSensitive    
public static Object newProxyInstance(ClassLoader loader,Class<?>[] interfaces,InvocationHandler h)throws IllegalArgumentException
    {
        Objects.requireNonNull(h);
		

		//复制一份接口的Class对象
	    final Class<?>[] intfs = interfaces.clone();
	    final SecurityManager sm = System.getSecurityManager();
	    if (sm != null) {
	        checkProxyAccess(Reflection.getCallerClass(), loader, intfs);
	    }
		//获取代理类（！！！这里代理类，不是代理对象）
	    Class<?> cl = getProxyClass0(loader, intfs);


        try {
            if (sm != null) {
                checkNewProxyPermission(Reflection.getCallerClass(), cl);
            }
    		//通过Class对像拿到相应的构造器(这里的参数就是InvocationHandler)
            final Constructor<?> cons = cl.getConstructor(constructorParams);
            final InvocationHandler ih = h;
            if (!Modifier.isPublic(cl.getModifiers())) {
                AccessController.doPrivileged(new PrivilegedAction<Void>() {
                    public Void run() {
                        cons.setAccessible(true);
                        return null;
                    }
                });
            }
            //通过构造器创建代理对象并返回
            return cons.newInstance(new Object[]{h});
        } catch (IllegalAccessException|InstantiationException e) {
            throw new InternalError(e.toString(), e);
        } catch (InvocationTargetException e) {
            Throwable t = e.getCause();
            if (t instanceof RuntimeException) {
                throw (RuntimeException) t;
            } else {
                throw new InternalError(t.toString(), t);
            }
        } catch (NoSuchMethodException e) {
            throw new InternalError(e.toString(), e);
        }
    }



```


如果我们要解开上面的疑惑，我们就需要看一看生成的代理对象的它的类文件是什么样的，接下来我们先打个断点debug一下看看：

![](https://cdn.jsdelivr.net/gh/Roxanne299/PictureBed//blog/202407022303978.png)

可以看到生成的代理类的名字，通过名字找到该class文件，对其进行反编译，如下：

```java
package com.sun.proxy;
import com.zwh.proxy02.Subject;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.lang.reflect.UndeclaredThrowableException;

public final class $Proxy0 extends Proxy implements Subject {
    private static Method m1;
    private static Method m3;
    private static Method m2;
    private static Method m0;

    public $Proxy0(InvocationHandler var1) throws  {
        super(var1);
    }
    
    public final boolean equals(Object var1) throws  {
        try {
            return (Boolean)super.h.invoke(this, m1, new Object[]{var1});
        } catch (RuntimeException | Error var3) {
            throw var3;
        } catch (Throwable var4) {
            throw new UndeclaredThrowableException(var4);
        }
    }
    
    public final void doLogin() throws  {
        try {
            super.h.invoke(this, m3, (Object[])null);
        } catch (RuntimeException | Error var2) {
            throw var2;
        } catch (Throwable var3) {
            throw new UndeclaredThrowableException(var3);
        }
    }
    
    public final String toString() throws  {
        try {
            return (String)super.h.invoke(this, m2, (Object[])null);
        } catch (RuntimeException | Error var2) {
            throw var2;
        } catch (Throwable var3) {
            throw new UndeclaredThrowableException(var3);
        }
    }
    
    public final int hashCode() throws  {
        try {
            return (Integer)super.h.invoke(this, m0, (Object[])null);
        } catch (RuntimeException | Error var2) {
            throw var2;
        } catch (Throwable var3) {
            throw new UndeclaredThrowableException(var3);
        }
    }
    
    static {
        try {
            m1 = Class.forName("java.lang.Object").getMethod("equals", Class.forName("java.lang.Object"));
            m3 = Class.forName("com.zwh.proxy02.Subject").getMethod("doLogin");
            m2 = Class.forName("java.lang.Object").getMethod("toString");
            m0 = Class.forName("java.lang.Object").getMethod("hashCode");
        } catch (NoSuchMethodException var2) {
            throw new NoSuchMethodError(var2.getMessage());
        } catch (ClassNotFoundException var3) {
            throw new NoClassDefFoundError(var3.getMessage());
        }
    }

}
```

如果是对应我们的例子:

```java
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.lang.reflect.UndeclaredThrowableException;
import proxy.UserService;

public final class UserServiceProxy extends Proxy implements UserService {
    private static Method m1;
    private static Method m2;
    private static Method m4;
    private static Method m0;
    private static Method m3;

    public UserServiceProxy(InvocationHandler var1) throws  {
        super(var1);
    }

    public final boolean equals(Object var1) throws  {
        // 省略...
    }

    public final String toString() throws  {
        // 省略...
    }

    public final void select() throws  {
        try {
            super.h.invoke(this, m4, (Object[])null);
        } catch (RuntimeException | Error var2) {
            throw var2;
        } catch (Throwable var3) {
            throw new UndeclaredThrowableException(var3);
        }
    }

    public final int hashCode() throws  {
        // 省略...
    }

    public final void update() throws  {
        try {
            super.h.invoke(this, m3, (Object[])null);
        } catch (RuntimeException | Error var2) {
            throw var2;
        } catch (Throwable var3) {
            throw new UndeclaredThrowableException(var3);
        }
    }

    static {
        try {
            m1 = Class.forName("java.lang.Object").getMethod("equals", Class.forName("java.lang.Object"));
            m2 = Class.forName("java.lang.Object").getMethod("toString");
            m4 = Class.forName("proxy.UserService").getMethod("select");
            m0 = Class.forName("java.lang.Object").getMethod("hashCode");
            m3 = Class.forName("proxy.UserService").getMethod("update");
        } catch (NoSuchMethodException var2) {
            throw new NoSuchMethodError(var2.getMessage());
        } catch (ClassNotFoundException var3) {
            throw new NoClassDefFoundError(var3.getMessage());
        }
    }
}

```

分析：代理类继承了Proxy类，并且实现了我们案例中定义的Subject接口，并且重写了doLogin()方法，着重看一下该方法的实现：

![](https://cdn.jsdelivr.net/gh/Roxanne299/PictureBed//blog/202407022303060.png)



可以看到doLogin()方法就是执行的super.h.invoke(…)方法，m3就是方法名；

这里的super.h是什么？super就是Proxy类吧，那就回到Proxy类中看看h是什么：

![在这里插入图片描述](https://cdn.jsdelivr.net/gh/Roxanne299/PictureBed//blog/202407022304772.png)

h就是InvocationHandler，并且通过有参构造器进行赋值的；那么我们追溯一下这个有参构造器是在哪被使用的。在$Proxy0这个生成的代理类的构造方法中调用了Proxy的有参构造器：

![在这里插入图片描述](https://cdn.jsdelivr.net/gh/Roxanne299/PictureBed//blog/202407022304611.png)

所以这里的h就是$Proxy0有参构造器中的InvocationHandler类型的var1，那么这个var1是谁呢？

就去Proxy#newProxyInstance的源码中去找，因为$Proxy0的实例是Proxy的newProxyInstance方法创建的，那么在newProxyInstance方法中会存在对$Proxy0构造器的调用：

![image-20240702230552839](https://cdn.jsdelivr.net/gh/Roxanne299/PictureBed//blog/202407022305043.png)

在newProxyInstance方法的形参中有个InvocationHandler类型的h，接着看newProxyInstance方法里面哪地方用到了这个h：

![image-20240702232626817](https://cdn.jsdelivr.net/gh/Roxanne299/PictureBed//blog/202407022326247.png)

破案了！！！$Proxy0类中doLogin()中的super.h.invake(…)，其实就是我们在这传入的MyInvocationhandler中的invoke()方法：

![在这里插入图片描述](https://cdn.jsdelivr.net/gh/Roxanne299/PictureBed//blog/202407022305976.png)

从以上分析就可以明白了，为什么在使用代理对象时，执行的是我们实现的InvocationHandler中的逻辑了；

## 总结

其实总结来说真正动态生成对应的增强对象是Proxy类，他返回我们的代理对象，然后调用代理对象的方法时，会调用invoke方法。




