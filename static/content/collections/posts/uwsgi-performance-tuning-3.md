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

{"widget":"qards-section-heading","config":"eyJ0aXRsZSI6IldoeSB3ZSBuZWVkIGl0PyIsInR5cGUiOiJzZWNvbmRhcnkifQ=="}

{"widget":"qards-section-heading","config":"eyJ0aXRsZSI6IkhvdyB0byB1c2UgY29yb3V0aW5lIGluIGZsYXNrIGFwcCJ9"}
