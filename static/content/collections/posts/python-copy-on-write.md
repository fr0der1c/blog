---
title: Python Web 内存调优，以及 Python 中的 Copy-on-Write
created_at: 2018-11-30T14:43:21.767Z
tags:
  - memory
  - Python
  - tuning
authors: Frederic Chan
categories: Python
meta:
  keywords: Python memory tuning
isPage: false
isFeatured: false
hero:
  image: /images/uploads/python_coroutine_2.png
excerpt: >-
  最近把所有服务迁移到 Kubernetes 之后，终于可以直观地通过可视化面板观察容器的资源使用情况了。在看的时候发现自己写的 Python Web
  项目一启动就要占用 250MB 左右内存，感觉有点偏高，于是尝试优化。这篇文章牵涉到 Linux 的 CoW 在 Python
  中的处理方式，目前中文互联网上没有什么资料，于是我顺便填补一下这个空白。
---
todo

{"widget":"qards-section-heading","config":"eyJ0eXBlIjoicHJpbWFyeSIsInRpdGxlIjoiVGhlIGxhenktYXBwIG9wdGlvbiJ9"}

1111

{"widget":"qards-section-heading","config":"eyJ0eXBlIjoicHJpbWFyeSIsInRpdGxlIjoiQWRhcHRpdmVseSBzcGF3bmluZyB3b3JrZXJzIn0="}

1111

{"widget":"qards-section-heading","config":"eyJ0eXBlIjoicHJpbWFyeSIsInRpdGxlIjoiSW5zdGFncmFtJ3Mgd2F5In0="}

Instagram 作为可能是世界上最大规模的（基于 django 的） Python Web 项目，在内存优化方面有不少尝试。我参看了他们的几篇文章：

* [Copy-on-write friendly Python garbage collection](https://instagram-engineering.com/copy-on-write-friendly-python-garbage-collection-ad6ed5233ddf)
* [Dismissing Python Garbage Collection at Instagram](https://instagram-engineering.com/dismissing-python-garbage-collection-at-instagram-4dca40b29172)

{"widget":"qards-section-heading","config":"eyJ0eXBlIjoicHJpbWFyeSIsInRpdGxlIjoiVHVuaW5nIEdDIn0="}

11

{"widget":"qards-section-heading","config":"eyJ0eXBlIjoicHJpbWFyeSIsInRpdGxlIjoiQ29uY2x1c2lvbiJ9"}
