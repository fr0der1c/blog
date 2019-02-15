---
title: 我如何对 uWSGI 进行性能调优（3）：使用协程
created_at: 2018-12-20T14:43:21.767Z
tags:
  - uWSGI
  - web
  - Python
  - coroutine
  - performance
authors: Frederic Chan
categories: Python
meta:
  keywords: uWSGI Python web
isPage: false
isFeatured: false
hero:
  image: /images/uploads/python_coroutine_2.png
excerpt: >-
  在上一篇文章中，我们谈到了不能随意设置 uWSGI worker 数量的原因，并通过实验大致推算出了在 CPU-bound 的程序中 worker
  的最佳数量。然而真实的环境中并不总是 CPU-bound 的，因此今天我们将使用协程（ coroutine ）来优化 IO-bound 时的情况。
---
这是 uWSGI 性能调优系列的第三篇文章，如果你还没有看过之前的两篇文章，建议你先阅读：


{"widget":"qards-reference","config":"eyJyZWZlcmVuY2UiOiLmiJHlpoLkvZXlr7kgdVdTR0kg6L+b6KGM5oCn6IO96LCD5LyY77yIMe+8ie+8muW/q+mAn+WPguaVsOiwg+aVtCJ9"}



{"widget":"qards-reference","config":"eyJyZWZlcmVuY2UiOiLmiJHlpoLkvZXlr7kgdVdTR0kg6L+b6KGM5oCn6IO96LCD5LyY77yIMu+8ie+8muiuvuWumiB3b3JrZXIg5pWw6YePIn0="}



{"widget":"qards-divider","config":"eyJ0eXBlIjoiYnVsbGV0cyJ9"}



{"widget":"qards-callout","config":"eyJpbnRlbnQiOiJ3YXJuaW5nIiwidGl0bGUiOiJOb3RpY2UiLCJtZXNzYWdlIjoiVGhpcyBhcnRpY2xlIGlzIG5vdCBmaW5pc2hlZCB5ZXQuIFBsZWFzZSBjb21lIGJhY2sgbGF0ZXIuIn0="}



{"widget":"qards-section-heading","config":"eyJ0aXRsZSI6IldoYXQgaXMgY29yb3V0aW5lPyIsInR5cGUiOiJwcmltYXJ5In0="}


在使用协程对我们的程序进行优化之前，我们先来了解一下什么是协程。

协程，英文名 Coroutine，它是一种用户态的轻量级线程。单说协程可能比较抽象，如果对线程有一定了解的话，应该就比较好理解了：

线程是系统级别的，由操作系统调度；而协程是程序级别的，程序员根据需要自己调度。我们把一个线程中的一个个函数叫做子程序，那么子程序在执行过程中可以中断去执行别的子程序；别的子程序也可以中断回来继续执行之前的子程序，这就是协程。也就是说同一线程下的一段代码 <1> 执行着执行着就可以中断，然后跳去执行另一段代码，当再次回来执行代码块 <1> 的时候，接着从之前中断的地方开始执行。

你可能会想问，为什么我们需要用这么奇怪的一个功能呢？我们都知道，一般情况下 IO 是阻塞的。当你在读数据库或者读文件时，当前的进程 / 线程会一直等待，直到 IO 操作返回结果才能继续执行后续的代码。如果只是一个本机运行的小程序倒是没有什么问题，但如果是应用服务器，这个问题就有点糟糕了：

经验上来说，服务器的 worker 数一般是 CPU 核心数的两倍左右。也就是说，对于四核的服务器，8 个 worker 差不多就是最优值了。在流量稍微大一点的情况下，八个 worker 都在 IO 的情况是很有可能出现的。这个时候**如果采用普通的同步 IO，那么所有的 worker 只能眼睁睁地看着请求到达服务器，而自己却因为正在 IO 等待做不了任何事情**。

你可能会想通过增加线程数来试图解决这个问题，因为 Python 的线程在 IO 时会自动出让 GIL，让同进程内的其他线程有执行的机会。不过很不幸，在我们之前的实验中我们已经发现了过多的增加线程数会增加线程上下文切换成本，反而降低吞吐量。（在  CPU-bound 的程序中测试会比在 IO-bound 的程序更加明显）

那么协程如何解决这个问题呢？我们可以通过协程实现异步的 IO，即**对于每一个线程来说，在自己 IO 时不再等待 IO 结果，而是先去处理新来的请求，等 IO 完成了再跳回到需要等待 IO 的这段代码**。通过这种方式，我们充分利用了程序中的每一个线程，让它们永远有事可做。虽然这种方式对单个请求的性能并没有提升（甚至可能还有下降），但协程对 IO 操作非常多的应用服务器的吞吐量提升是巨大的。


{"widget":"qards-section-heading","config":"eyJ0aXRsZSI6IkhvdyB0byB1c2UgY29yb3V0aW5lIGluIFB5dGhvbiIsInR5cGUiOiJwcmltYXJ5In0="}


在 Python 中使用协程不止一种方法。

* 你可以使用 **yield** 关键字来实现一个最简陋的协程
* 你可以使用 **greenlet** 包，调用 switch() 方法来在多个子程序之间切换
* 你可以使用 **gevent** 库，在应用了 gevent 的猴子补丁之后，gevent 会主动识别程序内部的 IO 操作。当子程序遇到 IO 后，切换到别的子程序。如果所有的子程序都进入 IO，则阻塞
* 甚至还有 **tornado** 这样天生强调协程的 web 框架


{"widget":"qards-section-heading","config":"eyJ0eXBlIjoicHJpbWFyeSIsInRpdGxlIjoiUG93ZXIgb2YgZ2V2ZW50In0="}


考虑到我们已经在使用 flask 了，我们当然不会通过更换 web 框架的方式来解决问题。那么，gevent 看起来是个不错的选择。

为了展示协程的威力，我们来做个测试。在 Flask 中添加如下代码：


{"widget":"qards-code","config":"eyJjb2RlIjoiQG1haW5fYmx1ZXByaW50LnJvdXRlKCcvc2xlZXAnKVxuZGVmIHNsZWVwKCk6XG4gICAgdGltZS5zbGVlcCg2MClcbiAgICByZXR1cm4gcmVuZGVyX3RlbXBsYXRlKCdpbmRleC5odG1sJykiLCJsYW5ndWFnZSI6InB5dGhvbiJ9"}


我们用 time.sleep 模拟耗时的 IO 操作，在非协程的模式下，我们设置了 6 个 worker。然后我们访问 6 次 /sleep，再尝试访问首页。这时你会发现首页已经无法打开了，因为我们的 6 个 worker 全部在等待耗时的操作，没有空闲的 worker 来处理新的请求。

然后我们加入协程：

* 在 uwsgi 配置文件中增加 gevent = 100
* 在程序最前面增加 from gevent import monkey; monkey.patch_all()

之后访问多次 /sleep 再尝试进行其他请求，可以发现其他请求并没有被阻塞。这说明协程在发挥作用了。


{"widget":"qards-section-heading","config":"eyJ0eXBlIjoicHJpbWFyeSIsInRpdGxlIjoiTm90aWNlIG9uIHVXU0dJIn0="}


请务必注意，如果你的 uWSGI 是自己编译的（官方称之为 modular build），你需要在 uwsgi.ini 中加入 python 和 gevent 两个插件。如果只加入 python 插件，不会报错，但此时仍是阻塞的 IO，这个问题坑了我好几天。

推荐的方法是 pip install uwsgi，通过这种方式编译的 uWSGI 自带了 python 相关插件，无需手动导入 gevent 插件。
