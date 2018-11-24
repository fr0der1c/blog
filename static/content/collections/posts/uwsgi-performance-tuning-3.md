---
title: 我如何对 uWSGI 进行性能调优（3）：使用协程
created_at: 2018-11-30T14:43:21.767Z
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
  image: /images/uploads/marko-blazevic-219788-unsplash.jpg
excerpt: >-
  在上一篇文章中，我们谈到了不能随意设置 uWSGI worker 数量的原因，并通过实验大致推算出了在 CPU-bound 的程序中 worker
  的最佳数量。然而真实的环境中并不总是 CPU-bound 的，因此今天我们将使用协程（ coroutine ）来优化 IO-bound 时的情况。
---
如果你还没有看过之前的两篇文章，建议你先阅读：

* [我如何对 uWSGI 进行性能调优（1）：快速参数调整](https://blog.admirable.pro/posts/uwsgi-performance-tuning/)
* [我如何对 uWSGI 进行性能调优（2）：设定 worker 数量](https://blog.admirable.pro/posts/uwsgi-performance-tuning-2/)

{"widget":"qards-divider","config":"eyJ0eXBlIjoiYnVsbGV0cyJ9"}

{"widget":"qards-callout","config":"eyJpbnRlbnQiOiJ3YXJuaW5nIiwidGl0bGUiOiJOb3RpY2UiLCJtZXNzYWdlIjoiVGhpcyBhcnRpY2xlIGlzIG5vdCBmaW5pc2hlZCB5ZXQuIFBsZWFzZSBjb21lIGJhY2sgbGF0ZXIuIn0="}

{"widget":"qards-section-heading","config":"eyJ0aXRsZSI6IldoYXQgaXMgY29yb3V0aW5lPyIsInR5cGUiOiJwcmltYXJ5In0="}

在使用协程对我们的程序进行优化之前，我们先来了解一下什么是协程。

协程，英文名 Coroutine，它是一种用户态的轻量级线程。单说协程可能比较抽象，如果对线程有一定了解的话，应该就比较好理解了：

线程是系统级别的，由操作系统调度；而协程是程序级别的，程序员根据需要自己调度。我们把一个线程中的一个个函数叫做子程序，那么子程序在执行过程中可以中断去执行别的子程序；别的子程序也可以中断回来继续执行之前的子程序，这就是协程。也就是说同一线程下的一段代码 <1> 执行着执行着就可以中断，然后跳去执行另一段代码，当再次回来执行代码块 <1> 的时候，接着从之前中断的地方开始执行。

你可能会想问，为什么我们需要用这么奇怪的一个功能呢？我们都知道，一般情况下 IO 是阻塞的。当你在读数据库或者读文件时，当前的进程 / 线程会一直等待，直到 IO 操作返回结果才能继续执行后续的代码。



{"widget":"qards-section-heading","config":"eyJ0aXRsZSI6IldoeSB3ZSBuZWVkIGl0PyIsInR5cGUiOiJzZWNvbmRhcnkifQ=="}

{"widget":"qards-section-heading","config":"eyJ0aXRsZSI6IkhvdyB0byB1c2UgY29yb3V0aW5lIGluIGZsYXNrIGFwcCJ9"}
