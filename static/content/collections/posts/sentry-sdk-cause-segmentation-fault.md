---
title: Sentry SDK 导致 Python 出现段异常
created_at: 2018-11-29T14:43:21.767Z
tags:
  - memory
  - Python
  - Sentry
  - Alpine
  - Linux
authors: Frederic Chan
categories: Python
meta:
  keywords: Python memory Sentry Alpine Linux
isPage: false
isFeatured: false
hero:
  image: /images/uploads/python_coroutine_2.png
excerpt: >-
  最近在每课服务器端内存优化的时候更改了 fork() 函数执行的位置，然而修改之后却导致程序在运行时出现段异常。对于 Python
  开发者来说，段异常这类底层的异常并不多见，因此调试过程也值得记录一下。
---


对于 Python 开发者来说，段异常是个很陌生的东西，平常基本不太遇到。最近在给程序调优的时候出现了段异常，导致程序被系统终止然后被 master respawn，然而 respawn 之后很快再次出现问题，一直这样循环。通过 Google 我们可以知道，是内存访问相关的问题。

由于解释器被操作系统终止，因此自然也没有 traceback 输出，因此我们无法从日志中发现问题的起源。幸运的是，Python 3.3 之后我们有了 faulthandler 模块，它可以打印出 trackback 信息。只需要将以下两行代码加入程序中：

{"widget":"qards-code","config":"eyJjb2RlIjoiaW1wb3J0IGZhdWx0aGFuZGxlclxuZmF1bHRoYW5kbGVyLmVuYWJsZSgpIiwibGFuZ3VhZ2UiOiJweXRob24ifQ=="}

根据程序输出的信息，我发现
