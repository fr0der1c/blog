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
  image: /images/uploads/marko-blazevic-219788-unsplash.jpg
excerpt: >-
  在上一篇文章中，我们谈到了 uWSGI worker
  的数量需要根据配置进行测试、精细调整，而不能拍脑门定一个数字。在这篇文章中，我会结合自己尝试的经历解释其中的原因。
---
如果你还没有看过上一篇文章，建议你先阅读：

{"widget":"qards-reference","config":"eyJyZWZlcmVuY2UiOiJ1d3NnaS1wZXJmb3JtYW5jZS10dW5pbmcifQ=="}

{"widget":"qards-divider","config":"eyJ0eXBlIjoiYnVsbGV0cyJ9"}

先直奔主题，说说 worker 数量设置过多的影响吧：**上下文切换过于频繁，导致每一个 worker 的处理时间成倍上升，最终造成吞吐量不升反降**。
