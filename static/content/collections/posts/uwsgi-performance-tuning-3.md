---
title: 我如何对 uWSGI 进行性能调优（3）：使用协程
created_at: 2018-11-30T14:43:21.767Z
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
  image: /images/uploads/marko-blazevic-219788-unsplash.jpg
excerpt: >-
  在上一篇文章中，我们谈到了不能随意设置 uWSGI worker 数量的原因，并通过实验大致推算出了在 CPU-bound 的程序中 worker
  的最佳数量。在这篇文章中，我们将使用协程（coroutine）来优化 IO-bound 时的情况。
---
如果你还没有看过之前的两篇文章，建议你先阅读：

* [我如何对 uWSGI 进行性能调优（1）：快速参数调整](https://blog.admirable.pro/posts/uwsgi-performance-tuning/)
* [我如何对 uWSGI 进行性能调优（2）：设定 worker 数量](https://blog.admirable.pro/posts/uwsgi-performance-tuning-2/)

{"widget":"qards-divider","config":"eyJ0eXBlIjoiYnVsbGV0cyJ9"}


todo
