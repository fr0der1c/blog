---
title: Sentry SDK 导致 Python 出现段异常
created_at: 2018-11-30T14:43:21.767Z
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
  最近在每课服务器端内存优化的时候更改了 fork() 函数执行的位置，然而修改之后却导致程序在运行时出现段异常。对于 Python 开发者来说，段异常这类问题并不多见。于是我对这个问题进行了一系列探究。
---
todo

11111
