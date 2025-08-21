---
title: tmux环境配置
pubDate: 2025-02-02 
categories: ["linux环境配置","tmux"]
description: "linux环境下tmux配置"
---
# Tmux 配置：打造最适合自己的终端复用工具


如果说有什么工具可以用**相见恨晚** 来形容的话，Tmux 算一个。

Tmuxs 是一款优秀的终端复用工具，使用它最直观的好处就是，通过一个终端登录远程主机并运行tmux后，在其中可以开启多个控制台而无需再“浪费”多余的终端来连接这台远程主机；

### 功能

- 提供了强劲的、易于使用的命令行界面。
- 可横向和纵向分割窗口。
- 窗格可以自由移动和调整大小，或直接利用四个预设布局之一。
- 支持 UTF-8 编码及 256 色终端。
- 可在多个缓冲区进行复制和粘贴。
- 可通过交互式菜单来选择窗口、会话及客户端。
- 支持跨窗口搜索。
- 支持自动及手动锁定窗口。
- 可以自由配置绑定快捷键。

## Tmux 重要概念

使用 Tmux 的时候千万不要去背指令，所有的指令都可以在 `.tmux.conf` 配置文件中绑定自己顺手的快捷键，也可以配置开启鼠标。

这个的配置文件：(版本1.6)

```text
set-option -g status-keys vi                                                                                                                              
setw -g mode-keys vi

setw -g monitor-activity on

# setw -g c0-change-trigger 10
# setw -g c0-change-interval 100

# setw -g c0-change-interval 50
# setw -g c0-change-trigger  75


set-window-option -g automatic-rename on
set-option -g set-titles on
set -g history-limit 100000

#set-window-option -g utf8 on

# set command prefix
set-option -g prefix C-a
unbind-key C-b
bind-key C-a send-prefix

bind h select-pane -L
bind j select-pane -D
bind k select-pane -U
bind l select-pane -R

bind -n M-Left select-pane -L
bind -n M-Right select-pane -R
bind -n M-Up select-pane -U
bind -n M-Down select-pane -D

bind < resize-pane -L 7
bind > resize-pane -R 7
bind - resize-pane -D 7
bind + resize-pane -U 7


setw -g mode-mouse on # 支持鼠标选取文本等 
setw -g mouse-resize-pane on # 支持鼠标拖动调整面板的大小(通过拖动面板间的分割线)
setw -g mouse-select-pane on # 支持鼠标选中并切换面板 
setw -g mouse-select-window on # 支持鼠标选中并切换窗口(通过点击状态栏窗口名称)
```

在Tmux逻辑中，需要分清楚Server > Session > Window > Pane这个大小和层级顺序是极其重要的，直接关系到工作效率：

- Server：是整个tmux的后台服务。有时候更改配置不生效，就要使用tmux kill-server来重启tmux。
- Session：是tmux的所有会话。我之前就错把这个session当成窗口用，造成了很多不便里。一般只要保存一个session就足够了。
- Window：相当于一个工作区，包含很多分屏，可以针对每种任务分一个Window。如下载一个Window，编程一个window。
- Pane：是在Window里面的小分屏。最常用也最好用

了解了这个逻辑后，整个Tmux的使用和配置也就清晰了。


## 安装[#](https://www.cnblogs.com/zuoruining/p/11074367.html#1737111550)

在 Mac OS 中，通过 brew 安装

```sh
brew install tmux
```

ubuntu版本下直接apt-get安装

```sh
sudo apt-get install tmux
```

centos7版本下直接yum安装

~~~sh
yum install -y tmux

```sh
centos6版本需要编译安装

```sh
yum install libevent libevent-devel ncurses-devel
tar -zvxf tmux-2.3.tar.gz # (提前下载：wget https://github.com/tmux/tmux/releases/download/2.3/tmux-2.3.tar.gz)
cd tmux-2.3
./configure
make && make install
~~~

## Tmux 常用命令

```powershell
#启动新session：
$ tmux [new -s 会话名 -n 窗口名]

#恢复session：
$ tmux at [-t 会话名]

#列出所有sessions：
$ tmux ls

#关闭session：
$ tmux kill-session -t 会话名

#关闭整个tmux服务器：
$ tmux kill-server
```

## Tmux 常用内部命令

> 所谓内部命令，就是进入Tmux后，并按下前缀键后的命令，一般前缀键为Ctrl+b. 虽然ctrl和b离得很远但是不建议改前缀键，因为别的键也不见得方便好记不冲突。还是记忆默认的比较可靠。

### 系统指令：

| 前缀   | 指令   | 描述                                   |
| ------ | ------ | -------------------------------------- |
| Ctrl+b | ?      | 显示快捷键帮助文档                     |
| Ctrl+b | d      | 断开当前会话                           |
| Ctrl+b | D      | 选择要断开的会话                       |
| Ctrl+b | Ctrl+z | 挂起当前会话                           |
| Ctrl+b | r      | 强制重载当前会话                       |
| Ctrl+b | s      | 显示会话列表用于选择并切换             |
| Ctrl+b | :      | 进入命令行模式，此时可直接输入ls等命令 |
| Ctrl+b | [      | 进入复制模式，按q退出                  |
| Ctrl+b | ]      | 粘贴复制模式中复制的文本               |
| Ctrl+b | ~      | 列出提示信息缓存                       |

### 窗口（window）指令：

| 前缀   | 指令 | 描述                                     |
| ------ | ---- | ---------------------------------------- |
| Ctrl+b | c    | 新建窗口                                 |
| Ctrl+b | &    | 关闭当前窗口                             |
| Ctrl+b | 0~9  | 切换到指定窗口                           |
| Ctrl+b | p    | 切换到上一窗口                           |
| Ctrl+b | n    | 切换到下一窗口                           |
| Ctrl+b | w    | 打开窗口列表，用于且切换窗口             |
| Ctrl+b | ,    | 重命名当前窗口                           |
| Ctrl+b | .    | 修改当前窗口编号（适用于窗口重新排序）   |
| Ctrl+b | f    | 快速定位到窗口（输入关键字匹配窗口名称） |

### 面板（pane）指令：

| 前缀   | 指令        | 描述                                                         |
| ------ | ----------- | ------------------------------------------------------------ |
| Ctrl+b | "           | 当前面板上下一分为二，下侧新建面板                           |
| Ctrl+b | %           | 当前面板左右一分为二，右侧新建面板                           |
| Ctrl+b | x           | 关闭当前面板（关闭前需输入y or n确认）                       |
| Ctrl+b | z           | 最大化当前面板，再重复一次按键后恢复正常（v1.8版本新增）     |
| Ctrl+b | !           | 将当前面板移动到新的窗口打开（原窗口中存在两个及以上面板有效） |
| Ctrl+b | ;           | 切换到最后一次使用的面板                                     |
| Ctrl+b | q           | 显示面板编号，在编号消失前输入对应的数字可切换到相应的面板   |
| Ctrl+b | {           | 向前置换当前面板                                             |
| Ctrl+b | }           | 向后置换当前面板                                             |
| Ctrl+b | Ctrl+o      | 顺时针旋转当前窗口中的所有面板                               |
| Ctrl+b | 方向键      | 移动光标切换面板                                             |
| Ctrl+b | o           | 选择下一面板                                                 |
| Ctrl+b | 空格键      | 在自带的面板布局中循环切换                                   |
| Ctrl+b | Alt+方向键  | 以5个单元格为单位调整当前面板边缘                            |
| Ctrl+b | Ctrl+方向键 | 以1个单元格为单位调整当前面板边缘（Mac下                     |
| Ctrl+b | t           | 显示时钟                                                     |

# 我的配置文件

## 使用

```shell
$ git clone git@github.com:zuorn/tmux-config.git
$ cp tmux-config/.tmux.conf ~/.tmux.conf
```

重启 tmux `restart tmux` 或者 在 tmux 窗口中，先按下 `Ctrl+b` 指令前缀，然后按下系统指令:，进入到命令模式后输入 `source-file ~/.tmux.conf`，回车后生效。

## 配置项[#](https://www.cnblogs.com/zuoruining/p/11074367.html#3166202626)

### 修改指令前缀[#](https://www.cnblogs.com/zuoruining/p/11074367.html#4008349237)

可根据自己的喜好来设置，如若要启用，取消注释即可。

```sh
#set -g prefix C-f #
#unbind C-f # C-b 即 Ctrl+b 键，unbind 意味着解除绑定
#bind C-f send-prefix # 绑定 Ctrl+f 为新的指令前缀

# 从tmux v1.6版起，支持设置第二个指令前缀
#set-option -g prefix2 ` # 设置一个不常用的`键作为指令前缀，按键更快些
```

### 添加加载配置文件快捷指令 r[#](https://www.cnblogs.com/zuoruining/p/11074367.html#388545320)

```sh
bind r source-file ~/.tmux.conf \; display-message "Config reloaded.."
```

### 支持鼠标[#](https://www.cnblogs.com/zuoruining/p/11074367.html#2723332423)

- 选取文本
- 调整面板大小
- 选中并切换面板

```sh
# 老版本：
#setw -g mode-mouse on # 支持鼠标选取文本等
#setw -g mouse-resize-pane on # 支持鼠标拖动调整面板的大小(通过拖动面板间的分割线)
#setw -g mouse-select-pane on # 支持鼠标选中并切换面板
#setw -g mouse-select-window on # 支持鼠标选中并切换窗口(通过点击状态栏窗口名称)

# v2.1及以上的版本
set-option -g mouse on
```

### 面板

#### 更改新增面板键

- - 垂直新增面板
- - 水平新增面板

```sh
unbind '"'
bind - splitw -v -c '#{pane_current_path}' # 垂直方向新增面板，默认进入当前目录
unbind %
bind =  splitw -h -c '#{pane_current_path}' # 水平方向新增面板，默认进入当前目录
```

#### 面板调整大小

绑定Ctrl+hjkl键为面板上下左右调整边缘的快捷指令

```sh
bind -r ^k resizep -U 10 # 绑定Ctrl+k为往↑调整面板边缘10个单元格
bind -r ^j resizep -D 10 # 绑定Ctrl+j为往↓调整面板边缘10个单元格
bind -r ^h resizep -L 10 # 绑定Ctrl+h为往←调整面板边缘10个单元格
bind -r ^l resizep -R 10 # 绑定Ctrl+l为往→调整面板边缘10个单元格
```

### 复制模式

#### 复制模式更改为 vi 风格

```sh
setw -g mode-keys vi # 开启vi风格后，支持vi的C-d、C-u、hjkl等快捷键
```

#### 复制模式向 vi 靠拢

- v 开始选择文本
- y 复制选中文本
- p 粘贴文本

```sh
bind -t vi-copy v begin-selection # 绑定v键为开始选择文本
bind -t vi-copy y copy-selection # 绑定y键为复制选中文本
bind p pasteb # 绑定p键为粘贴文本（p键默认用于进入上一个窗口，不建议覆盖）
```

### 优化

#### 设置窗口面板起始序号

```sh
set -g base-index 1 # 设置窗口的起始下标为1
set -g pane-base-index 1 # 设置面板的起始下标为1
```

#### 自定义状态栏

```sh
set -g status-utf8 on # 状态栏支持utf8
set -g status-interval 1 # 状态栏刷新时间
set -g status-justify left # 状态栏列表左对齐
setw -g monitor-activity on # 非当前窗口有内容更新时在状态栏通知

set -wg window-status-format " #I #W " # 状态栏窗口名称格式
set -wg window-status-current-format " #I:#W#F " # 状态栏当前窗口名称格式(#I：序号，#w：窗口名称，#F：间隔符)
set -wg window-status-separator "" # 状态栏窗口名称之间的间隔
```

## Tmux 常见问题

### Tmux不管怎么改配置文件，都不产生变化

这个主要是由于Tmux的后台缓存机制造成的。我就犯了个大错误：甚至删了Tmux、重装Tmux、重启电脑，都没达成。
Tmux会有一个叫Tmux-server的东西。只要把它kill，重启tmux就OK了：

```css
tmux kill-server -a
```
