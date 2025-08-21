---
title: docker环境配置
pubDate: 2023-08-01
categories: ["linux环境配置","docker"]
description: "linux环境下docker和docker-compose环境的配置"
---
# Docker以及Docker Compose安装

以下docker安装内容参考自 https://cloud.tencent.com/developer/article/1701451

## docker安装

### 一、安装前必读

在安装 [Docker](https://cloud.tencent.com/product/tke?from_column=20065&from=20065) 之前，先说一下配置，我这里是Centos7 Linux 内核：官方建议 3.10 以上，3.8以上貌似也可。

注意：本文的命令使用的是 root 用户登录执行，不是 root 的话所有命令前面要加 `sudo`

**1.查看当前的内核版本**

```shell
uname -r
```

![img](https://cdn.jsdelivr.net/gh/Roxanne299/PictureBed//blog/202502021457928.png)

我这里是3.10 ，满足条件。

**2.使用 root 权限更新 yum 包（生产环境中此步操作需慎重，看自己情况，学习的话随便搞）**

```shell
yum -y update
```

这个命令不是必须执行的，看个人情况，后面出现不兼容的情况的话就必须update了

```shell
yum -y update：# 升级所有包同时也升级软件和系统内核； 
yum -y upgrade：# 只升级所有包，不升级软件和系统内核
```

**3.卸载旧版本（如果之前安装过的话）**

```shell
yum remove docker  docker-common docker-selinux docker-engine
```

![img](https://cdn.jsdelivr.net/gh/Roxanne299/PictureBed//blog/202502021459339.png)

### 二、安装Docker的详细步骤

**1.安装需要的软件包， yum-util 提供yum-config-manager功能，另两个是devicemapper驱动依赖**

代码语言：javascript

复制

```javascript
解释



yum install -y yum-utils device-mapper-persistent-data lvm2
```

**2.设置 yum 源**

设置一个yum源，下面两个都可用

代码语言：javascript

复制

```javascript
解释yum-config-manager --add-repo http://download.docker.com/linux/centos/docker-ce.repo（中央仓库）

yum-config-manager --add-repo http://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo（阿里仓库）
```

![img](https://cdn.jsdelivr.net/gh/Roxanne299/PictureBed//blog/202502021500082.png)

3.选择docker版本并安装 （1）查看可用版本有哪些

```shell
yum list docker-ce --showduplicates | sort -r
```

![img](https://cdn.jsdelivr.net/gh/Roxanne299/PictureBed//blog/202502021459376.png)

 （2）选择一个版本并安装：`yum install docker-ce-版本号`

```shell
yum -y install docker-ce-18.03.1.ce
```

![img](https://cdn.jsdelivr.net/gh/Roxanne299/PictureBed//blog/202502021459830.png)

 出现下图说明安装成功 

![img](https://cdn.jsdelivr.net/gh/Roxanne299/PictureBed//blog/202502021459342.png)

4.启动 Docker 并设置开机自启

```shell
systemctl start docker
systemctl enable docker
```

![img](https://cdn.jsdelivr.net/gh/Roxanne299/PictureBed//blog/202502021459826.png)

## Compose 安装

Linux 上我们可以从 Github 上下载它的二进制包来使用，最新发行的版本地址：https://github.com/docker/compose/releases。

运行以下命令以下载 Docker Compose 的当前稳定版本：

```shell
$ sudo curl -L "https://github.com/docker/compose/releases/download/v2.2.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
```

要安装其他版本的 Compose，请替换 v2.2.2。

> Docker Compose 存放在 GitHub，不太稳定。
>
> 你可以也通过执行下面的命令，高速安装 Docker Compose。
>
> ```shell
> curl -L https://get.daocloud.io/docker/compose/releases/download/v2.4.1/docker-compose-`uname -s`-`uname -m` > /usr/local/bin/docker-compose
> ```

将可执行权限应用于二进制文件：

```shell
sudo chmod +x /usr/local/bin/docker-compose
```

创建软链：

```shell
sudo ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose
```

测试是否安装成功：

```shell
docker-compose version
cker-compose version 1.24.1, build 4667896b
```
