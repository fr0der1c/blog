---
title: 内存调优历险记：Python 中的 Copy-on-Write
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
  image: /images/uploads/python_coroutine.png
excerpt: >-
  最近把所有服务迁移到 Kubernetes 之后，终于可以直观地通过可视化面板观察各个容器的资源使用情况了。在看内存占用的时候发现自己写的 Python
  Web 项目一启动就要占用 200MB 左右内存，有点偏高，于是尝试优化一下。
---
todo

Instagram 作为可能是世界上最大规模的（基于 django 的） Python Web 项目，在内存优化方面有不少尝试。我参看了他们的几篇文章：

* [Copy-on-write friendly Python garbage collection](https://instagram-engineering.com/copy-on-write-friendly-python-garbage-collection-ad6ed5233ddf)
* [Dismissing Python Garbage Collection at Instagram](https://instagram-engineering.com/dismissing-python-garbage-collection-at-instagram-4dca40b29172)

