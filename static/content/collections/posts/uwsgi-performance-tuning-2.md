---
title: 我如何对 uWSGI 进行性能调优（2）：设定 worker 数量
created_at: 2018-11-23T14:43:21.767Z
tags:
  - uWSGI
  - web
  - Python
authors: Frederic Chan
categories: Python
meta:
  keywords: uWSGI Python web
isPage: false
isFeatured: false
hero:
  image: /images/uploads/uwsgi_logo.png
excerpt: >-
  在上一篇文章中，我们谈到了 uWSGI worker
  的数量需要根据配置进行测试、精细调整，而不能拍脑门定一个数字。在这篇文章中，我会结合自己尝试的经历解释其中的原因。
---
如果你还没有看过上一篇文章，建议你先阅读：<https://blog.admirable.pro/posts/uwsgi-performance-tuning/>。

{"widget":"qards-divider","config":"eyJ0eXBlIjoiYnVsbGV0cyJ9"}

先直奔主题，说说 worker 数量设置过多的影响吧：**上下文切换过于频繁，导致每一个 worker 的处理时间成倍上升，最终造成吞吐量不升反降**。这里提供一个亲身案例：

本次测试的对象是每课的首页。首页的视图函数里没有业务逻辑，仅仅是渲染一个模板。模板内有一些 g 变量中的内容。测试在 Docker for Mac 上进行，分配的资源是 2 核心、4GB 内存。

当 `worker=8`、`thread=8`的时候，TPS 为 217。

当 `worker=10`、`thread=2`的时候，三次测试的结果如下：

{"widget":"qards-code","config":"eyJjb2RlIjoiUmVxdWVzdHMgcGVyIHNlY29uZDogICAgMjMxLjQ0IFsjL3NlY10gKG1lYW4pXG5UaW1lIHBlciByZXF1ZXN0OiAgICAgICA4NjQxLjQwMSBbbXNdIChtZWFuKVxuVGltZSBwZXIgcmVxdWVzdDogICAgICAgNC4zMjEgW21zXSAobWVhbiwgYWNyb3NzIGFsbCBjb25jdXJyZW50IHJlcXVlc3RzKVxuXG5SZXF1ZXN0cyBwZXIgc2Vjb25kOiAgICAxODMuOTUgWyMvc2VjXSAobWVhbilcblRpbWUgcGVyIHJlcXVlc3Q6ICAgICAgIDEwODcyLjM5NyBbbXNdIChtZWFuKVxuVGltZSBwZXIgcmVxdWVzdDogICAgICAgNS40MzYgW21zXSAobWVhbiwgYWNyb3NzIGFsbCBjb25jdXJyZW50IHJlcXVlc3RzKVxuXG5SZXF1ZXN0cyBwZXIgc2Vjb25kOiAgICAyMDcuNTYgWyMvc2VjXSAobWVhbilcblRpbWUgcGVyIHJlcXVlc3Q6ICAgICAgIDk2MzUuNjEyIFttc10gKG1lYW4pXG5UaW1lIHBlciByZXF1ZXN0OiAgICAgICA0LjgxOCBbbXNdIChtZWFuLCBhY3Jvc3MgYWxsIGNvbmN1cnJlbnQgcmVxdWVzdHMpIn0="}

测试过程中内存占用一直不大，但是 CPU 的占用有 150% 左右（通过 docker stats 查看），于是尝试调整虚拟机资源（again, Docker for Mac 运行在虚拟机中）。于是将 CPU 调整到 4 核心。

这个时候发现 uWSGI 提供了一个模式叫 cheap 模式，功能就是可以根据当前的工作压力动态增加或减少 worker 数量。于是打开了 cheap 模式，为了测试极限情况，设置进程数上限为 100。

{"widget":"qards-code","config":"eyJjb2RlIjoiY2hlYXBlciA9IDNcbmNoZWFwZXItYWxnbyA9IGJhY2tsb2dcbndvcmtlciA9IDEwMCIsImxhbmd1YWdlIjoiaW5pIn0="}

这个时候再进行测试，TPS 有 280-300 左右了，但是远远没有想象中的提升。这个时候就需要进程级别的分析了。uWSGI 自带了一个性能指标统计功能，我们可以通过如下的设置打开：

{"widget":"qards-code","config":"eyJjb2RlIjoiIyBzdGF0cyBzZXJ2ZXJcbnN0YXRzID0gL3RtcC91d3NnaS1zdGF0cy5zb2NrXG5tZW1vcnktcmVwb3J0ID0gdHJ1ZSIsImxhbmd1YWdlIjoiaW5pIn0="}

在启用了 stats 之后，我们需要一个可视化工具来查看数据，官方的工具是 uwsgitop（<https://github.com/unbit/uwsgitop>）。我们可以通过 pip 安装它。使用 `uwsgitop /tmp/uwsgi-stats.sock` 发现每个进程的平均请求时间（AVG）随着进程数的增多从几十 ms 上升到 600ms。

我们已经解决了惊群问题，所以这里之所以进程越多效率反而越低，合理的推测就是上下文切换过于频繁，导致每一个 worker 需要轮转很多个时间片才能完成一个请求，单个请求处理时间成倍上升，最终造成吞吐量不升反降。（实际上，cheap 功能有多种算法决定是否新开 / 回收进程，backlog 确实是中间比较野蛮的一个，不过这让我们成功发现了问题）

为了印证这个猜测，我尝试把进程数上限调到 20，发现 TPS 上升到 350。而在 worker 数改到 10 之后 TPS 上升到 370-390，并且通过 uwsgitop 命令看到每个进程的平均响应时间是几十毫秒的正常范围。在 worker 调整到 6 之后，TPS 上升到了 449。说明**在资源有限的情况下，进程开太多确实会造成进程之间 CPU 竞争过于严重的问题**。根据这个实验结果，个人猜测 worker 数量设置到 CPU 核心数的 1 倍到 2 倍是比较合理的（没有印证，如果读者对此印证过请告诉我）。

值得注意的是，我们这次测试的用例可能比较偏向 CPU-bound，如果是一个 IO-bound 的用例，测试出来的结果可能稍有不同。

引用一下官方文档中的一句话：

> There is no magic rule for setting the number of processes or threads to use. It is very much application and system dependent. Simple math like `processes = 2 * cpucores` will not be enough. You need to experiment with various setups and be prepared to constantly monitor your apps. `uwsgitop` could be a great tool to find the best values.

至此，uWSGI 部分的调优就差不多了。接下来我会开始考虑程序代码、业务逻辑方面的调优。
