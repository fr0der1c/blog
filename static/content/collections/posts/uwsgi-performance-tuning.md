---
title: 我如何对 uWSGI 进行性能调优（1）：快速参数调整
created_at: 2018-11-21T14:43:21.767Z
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
  uWSGI 是 Python Web
  世界里广泛采用的应用服务器。它的配置非常复杂，如果要用于生产环境，有很多东西值得细细了解。本篇文章作为自己进行性能调优的记录。
---
最近看了一篇文章（<https://blog.codeship.com/getting-every-microsecond-out-of-uwsgi/>），看完之后随手测试了一下每课服务器端的性能。不测不知道，一测吓一跳，课表查询的 QPS 只有 30/s 左右。虽然似乎并不太影响用户的实际使用，但是这个性能显然有点太惨了，于是开始尝试对性能进行 tuning。

因为每课的业务逻辑是大一刚入学的时候写的，那时候知识量比较有限，所以基本是一个“又不是不能用”的情况，性能不会特别好。考虑到我们已经重新设计了一套新的数据库结构、并且课表查询相关的业务逻辑即将迁移到专门的微服务内进行，这个时候再花时间去改老的业务逻辑不是特别必要，因此**本次优化的基本思路是：先优化 uWSGI 相关的，再优化（实在看不过去的）业务逻辑。**

在明确了这个目标之后，考虑到健康检查页面（/_healthCheck）是一个没有数据库查询、甚至没有任何业务逻辑直接返回 JSON 的 endpoint，我选择了它作为优化 uWSGI 时测试的对象。


{"widget":"qards-callout","config":"eyJ0aXRsZSI6IuaPkOekuiIsImludGVudCI6Indhcm5pbmciLCJtZXNzYWdlIjoi6YCa5bi45oOF5Ya15LiL77yM5L2g6ZyA6KaB5Zyo5YGl5bq35qOA5p+l5Lit5rWL6K+V5pWw5o2u5bqT6L+e5o6l562J44CC5L2G5a+55LqO55uu5YmN55qEIGV2ZXJ5Y2xhc3Mtc2VydmVy77yM5oiR5Lus5LuF5LuF6L+U5Zue5LqG5LiA5LiqIGB7XCJzdGF0dXNcIjogXCJva1wifWAgSlNPTuOAgiJ9"}



{"widget":"qards-callout","config":"eyJpbnRlbnQiOiJwcmltYXJ5IiwidGl0bGUiOiLlrp7pmYXmg4XlhrUiLCJtZXNzYWdlIjoi5a6e6ZmF5oOF5Ya15q+U5oiR5Zyo5LiK6Z2i6K+055qE6KaB5pu05Yqg5aSN5p2C5LiA5Lqb77yaXG5cbuWcqOivt+axguiiq+inhuWbvuWHveaVsOWkhOeQhuS5i+WJje+8jOaIkeS7rOacieS4gOS4qiBgYmVmb3JlX3JlcXVlc3RgIOmSqeWtkOeUqOadpeagh+ivhuavj+S4gOS4queLrOeri+eahOeUqOaIt+OAguWcqOmSqeWtkOeahOWHveaVsOS4re+8jOeoi+W6j+S8muiuv+mXruaVsOaNruW6k+adpeiOt+WPluS4gOS4quWUr+S4gOeUqOaIt+agh+ivhuespu+8jOi/meS8muWvvOiHtOe9kee7nCBJT+W8gOmUgOOAguS9huaIkeS7rOebruWJjea1i+ivleeahOS6i+S4jue9kee7nCBJL08g5peg5YWz55qE5oCn6IO96Zeu6aKY77yI572R57ucIEkvTyDnm7jlhbPnmoTmiJHku6zmmZrkuIDkupvml7blgJnlho3osIjvvInvvIzmiYDku6XmiJHkuLTml7blj5bmtojmjonkuobov5nkuKrpkqnlrZDjgIIifQ=="}



{"widget":"qards-section-heading","config":"eyJ0aXRsZSI6Iuiwg+S8mOWJjeeahOWHhuWkhyIsInR5cGUiOiJwcmltYXJ5In0="}



{"widget":"qards-section-heading","config":"eyJ0eXBlIjoic2Vjb25kYXJ5IiwidGl0bGUiOiLmtYvph4/ln7rlh4bnur8ifQ=="}


首先贴一下 tuning 之前的 uwsgi.ini：


{"widget":"qards-code","config":"eyJsYW5ndWFnZSI6ImluaSIsImNvZGUiOiJbdXdzZ2ldXG5jaGRpciA9IC92YXIvZXZlcnljbGFzcy1zZXJ2ZXJcbnZlbnYgPSAudmVudlxucHl0aG9ucGF0aCA9IC92YXIvZXZlcnljbGFzcy1zZXJ2ZXJcblxuIyBsYXVuY2hlclxud3NnaS1maWxlID0gZWNfc2VydmVyLnB5XG5jYWxsYWJsZSA9IGFwcFxuXG4jIHdvcmtlcnNcbm1hc3RlciA9IHRydWVcbnByb2Nlc3NlcyA9IDRcbnRodW5kZXItbG9jayA9IHRydWVcbmxhenktYXBwcyA9IGZhbHNlXG5cbiMgZGVzdHJveSBzdHVja2VkIHByb2Nlc3Nlc1xuaGFyYWtpcmkgPSAzMFxuXG4jIHRocmVhZGluZyBzdXBwb3J0XG5lbmFibGUtdGhyZWFkcyA9IHRydWVcblxucGx1Z2lucyA9IC91c3IvbG9jYWwvbGliL3V3c2dpL3B5dGhvbjM3XG5cbiMgdG91Y2ggdG8gcmVsb2FkXG50b3VjaC1yZWxvYWQgPSAvdmFyL2V2ZXJ5Y2xhc3Mtc2VydmVyL3JlbG9hZFxuXG4jIHVzZSBtZWFuaW5nZnVsIG5hbWVcbmF1dG8tcHJvY25hbWUgPSB0cnVlXG5cbiMgaGFuZGxlIHVXU0dJIHdyaXRlIGVycm9yXG5pZ25vcmUtc2lncGlwZSA9IHRydWVcbmlnbm9yZS13cml0ZS1lcnJvcnMgPSB0cnVlXG5kaXNhYmxlLXdyaXRlLWV4Y2VwdGlvbiA9IHRydWUifQ=="}


我们先用这个配置跑出一个成绩作为后续调优的 baseline：

```bash
$ ab -c 500 -n 5000 -s 90 http://127.0.0.1:80/_healthCheck
```

结果如下：


{"widget":"qards-code","config":"eyJjb2RlIjoiUmVxdWVzdHMgcGVyIHNlY29uZDogICAgMTEwMS40NSBbIy9zZWNdIChtZWFuKVxuVGltZSBwZXIgcmVxdWVzdDogICAgICAgOTA3Ljg5NCBbbXNdIChtZWFuKVxuVGltZSBwZXIgcmVxdWVzdDogICAgICAgMC45MDggW21zXSAobWVhbiwgYWNyb3NzIGFsbCBjb25jdXJyZW50IHJlcXVlc3RzKSJ9"}



{"widget":"qards-section-heading","config":"eyJ0eXBlIjoic2Vjb25kYXJ5IiwidGl0bGUiOiLkuI3opoHlnKggTWFjIOS4iuS9v+eUqCBBcGFjaGUgQmVuY2htYXJr77yBIn0="}


当我尝试增大并发量的时候，出现了问题：


{"widget":"qards-code","config":"eyJjb2RlIjoiQmVuY2htYXJraW5nIDEyNy4wLjAuMSAoYmUgcGF0aWVudClcbkNvbXBsZXRlZCA1MDAgcmVxdWVzdHNcbkNvbXBsZXRlZCAxMDAwIHJlcXVlc3RzXG5Db21wbGV0ZWQgMTUwMCByZXF1ZXN0c1xuQ29tcGxldGVkIDIwMDAgcmVxdWVzdHNcbkNvbXBsZXRlZCAyNTAwIHJlcXVlc3RzXG5Db21wbGV0ZWQgMzAwMCByZXF1ZXN0c1xuQ29tcGxldGVkIDM1MDAgcmVxdWVzdHNcblxuVGVzdCBhYm9ydGVkIGFmdGVyIDEwIGZhaWx1cmVzXG5hcHJfc29ja2V0X2Nvbm5lY3QoKTogQ29ubmVjdGlvbiByZXNldCBieSBwZWVyICg1NCkifQ=="}


经过搜索，发现网友纷纷表示这是 Mac 自带的 ab 的锅，有说要自己编译的，有说要修改 ulimit 的，但是我两个都尝试了，并没有解决问题。最终看到别人得出的结论：**ab doesn't work on macOS** （<https://serverfault.com/questions/806585/why-is-ab-erroring-with-apr-socket-recv-connection-reset-by-peer-54-on-osx>）。不过也不是没有 workaround，你可以在 Docker for Mac 里运行 ab（Docker for Mac 自带了一个 Linux 虚拟机）。

使用 `docker run -it --rm --net host httpd bash` 来启动一个包含 ab 的容器，之后使用 ab 都使用这个容器里的 ab。


{"widget":"qards-section-heading","config":"eyJ0eXBlIjoic2Vjb25kYXJ5IiwidGl0bGUiOiLosIPmlbQgYG5ldC5jb3JlLnNvbWF4Y29ubmAg5Y+C5pWwIn0="}


当你所有的 worker 都在处理任务时，它们无法 accept 新的请求。因此在请求源源不断地到来时，你的内核缓冲区将不断积累未被 accept 的连接，直到超过内核的 `net.core.somaxconn` 上限。Linux 中这个参数的默认值为 128。这个值对于 Web 服务器来说太小了，因此我们需要修改这个参数。

在基于 Kubernetes 的生产环境中，在 Pod 的 template 中加入 `"security.alpha.kubernetes.io/unsafe-sysctls": "net.core.somaxconn=4096"` 即可。（需要先配置节点上的 kubelet，允许 `net.core.somaxconn`这个 unsafe sysctl，配置方法可参考 <http://bazingafeng.com/2017/12/23/kubernetes-uses-the-security-context-and-sysctl/>。原先我以为修改了宿主的内核参数就可以了，但是后来发现 Docker 对这个参数好像有隔离）

由于我在本地测试的使用使用的是 docker-compose，因此需要把这个参数加入到 `docker-compose.yml` 中：


{"widget":"qards-code","config":"eyJjb2RlIjoidmVyc2lvbjogXCIzXCJcbnNlcnZpY2VzOlxuICBldmVyeWNsYXNzLXNlcnZlcjpcbiAgICBpbWFnZTogZXZlcnljbGFzcy1zZXJ2ZXI6bGF0ZXN0XG4gICAgc3lzY3RsczpcbiAgICAtIG5ldC5jb3JlLnNvbWF4Y29ubj00MDk2XG4gICAgZW52aXJvbm1lbnQ6XG4gICAgICBNT0RFOiBERVZFTE9QTUVOVFxuICAgIHBvcnRzOlxuICAgIC0gODA6ODAiLCJsYW5ndWFnZSI6InlhbWwifQ=="}


除了内核的限制之外，还有 uWSGI 本身的限制。因此，在 uWSGI 配置文件中加入：`listen = 4096`（即监听队列长度为 4096），现在启动 uWSGI 时你可以看到 `your server socket listen backlog is limited to 4096 connections` 的字样，表明设置成功了。（如果这个值设置的比系统最大值大，会导致 uWSGI 无法启动）


{"widget":"qards-section-heading","config":"eyJ0eXBlIjoicHJpbWFyeSIsInRpdGxlIjoi5YWz6Zet5pel5b+XIn0="}


我们来尝试一些邪门的小技巧吧，比如关闭 uWSGI 的访问日志。关闭它对我们不会产生多大的影响，因为生产环境中在反向代理处会有日志，而在开发环境中，无用的访问日志会淹没重要的报错信息。在 uWSGI 的配置文件中加入 `disable-logging = True` ，然后我们再来测试一下性能：


{"widget":"qards-code","config":"eyJjb2RlIjoiUmVxdWVzdHMgcGVyIHNlY29uZDogICAgMTU0Mi40MyBbIy9zZWNdIChtZWFuKVxuVGltZSBwZXIgcmVxdWVzdDogICAgICAgNjQ4LjMyNiBbbXNdIChtZWFuKVxuVGltZSBwZXIgcmVxdWVzdDogICAgICAgMC42NDggW21zXSAobWVhbiwgYWNyb3NzIGFsbCBjb25jdXJyZW50IHJlcXVlc3RzKSJ9"}


老实说，在测试之前我并不太相信关闭日志会对性能造成多大的提升。但结果表明，关闭日志使程序每秒钟多处理了 441 个请求。


{"widget":"qards-section-heading","config":"eyJ0eXBlIjoicHJpbWFyeSIsInRpdGxlIjoi5aKe5Yqg5pu05aSa55qEIHdvcmtlciJ9"}


在性能不够时，增加 worker 是一个很常见的思路。我们当前的配置只有 4 个进程（每个进程中一个线程），这意味着如果 4 个 worker 都在忙碌，程序就会暂时卡住。当然，比这更糟糕的是，如果代码出现了死循环，并且这段死循环代码在全部 worker 中执行，并且你没有设置 `harakiri` 参数，你的程序会永久卡住，除非你强行重启 uWSGI。

我们增加 worker 数量到 10，然后再次测试：


{"widget":"qards-code","config":"eyJjb2RlIjoiUmVxdWVzdHMgcGVyIHNlY29uZDogICAgMTQzMC44MCBbIy9zZWNdIChtZWFuKVxuVGltZSBwZXIgcmVxdWVzdDogICAgICAgNzQ2LjEwOSBbbXNdIChtZWFuKVxuVGltZSBwZXIgcmVxdWVzdDogICAgICAgMC43NDYgW21zXSAobWVhbiwgYWNyb3NzIGFsbCBjb25jdXJyZW50IHJlcXVlc3RzKSJ9"}


测试的结果令我们有点惊讶，增大 worker 数量到 10 之后，吞吐量不仅没有上升，反而稍微下降了。欢迎来到惊群问题（thundering the herd）。


{"widget":"qards-section-heading","config":"eyJ0eXBlIjoic2Vjb25kYXJ5IiwidGl0bGUiOiLmg4rnvqTpl67popgifQ=="}


惊群简单来说就是多个进程或者线程在等待同一个事件，当事件发生时，所有线程和进程都会被内核唤醒。唤醒后通常只有一个进程获得了该事件并进行处理，其他进程发现获取事件失败后又继续进入了等待状态。监听同一个事件的进程数越多，争用 CPU 的情况越严重（尽管实际上只有一个进程能成功获得事件并进行处理），造成了严重的上下文切换成本。

内核的设计者并不傻。在 Linux 2.6 以后，多个进程监听一个文件描述符的 `accept()` 操作，内核会防止出现惊群问题。大概的处理方式就是，当内核接收到一个客户连接后，只会唤醒等待队列上的第一个进程或线程。然而，并不是所有的惊群问题都能在内核中解决。比如，uWSGI 的循环引擎示例代码如下：


{"widget":"qards-code","config":"eyJjb2RlIjoiZm9yKDs7KSB7XG4gICAgaW50IGludGVyZXN0aW5nX2ZkID0gd2FpdF9mb3JfZmRzKCk7XG4gICAgaWYgKGZkX25lZWRfYWNjZXB0KGludGVyZXN0aW5nX2ZkKSkge1xuICAgICAgICBpbnQgY2xpZW50ID0gYWNjZXB0KGludGVyZXN0aW5nX2ZkLCAuLi4pO1xuICAgICAgICBpZiAoY2xpZW50IDwgMCkgY29udGludWU7XG4gICAgfVxuICAgIGVsc2UgaWYgKGZkX2lzX2Ffc2lnbmFsKGludGVyZXN0aW5nX2ZkKSkge1xuICAgICAgICBtYW5hZ2VfdXdzZ2lfc2lnbmFsKGludGVyZXN0aW5nX2ZkKTtcbiAgICB9XG4gICAgLi4uXG59IiwibGFuZ3VhZ2UiOiJjcHAifQ=="}


uWSGI 并不是只需要监听 accept() 请求，因此内核对 accept() 的防惊群优化对 uWSGI 并不起作用。那么 uWSGI 如何解决惊群问题？官方提供的解决方案是 thunder lock。简要来说，thunder lock 是一把 worker 进程间共享的锁，同一时刻只会有一个进程在监听 `accept()`，通过将监听串行化，避免了惊群问题 （这也是 Apache 和 Nginx 采用的方案）。

虽然频繁的加锁解锁听起来非常低效，但是连 Nginx 这样高效的程序都是采用这样的方案，对于我们的小项目来说肯定也问题不大。

**事实上，当你在 uWSGI 中使用多线程而非多进程时，uWSGI 会自动创建一个 pthread mutex，将各个线程中的 epoll() / kqueue() / poll() / select()… 操作串行化。但在多进程的模式下，你需要手动开启 thunder lock。**

可能你会问，为什么我们使用多进程而不是多线程呢？主要是因为，我们的 app 是用 Python 写的。Python 在多线程的模式下，多个线程会共享同一把 GIL，对于 CPU-bound 的操作来说，没有带来实际的效率提升。而使用多进程，实际上是有多个解释器在工作，每个解释器有自己的 GIL，因此性能提升更高。

关于 uWSGI 和惊群问题，官方有一篇文档值得阅读：<https://uwsgi-docs.readthedocs.io/en/latest/articles/SerializingAccept.html>。

我们在 uWSGI 配置文件中添加 `thunder-lock = True`，然后再测试一次性能：


{"widget":"qards-code","config":"eyJjb2RlIjoiUmVxdWVzdHMgcGVyIHNlY29uZDogICAgMTY4My4wNCBbIy9zZWNdIChtZWFuKVxuVGltZSBwZXIgcmVxdWVzdDogICAgICAgNTAxLjAyNyBbbXNdIChtZWFuKVxuVGltZSBwZXIgcmVxdWVzdDogICAgICAgMC41MDEgW21zXSAobWVhbiwgYWNyb3NzIGFsbCBjb25jdXJyZW50IHJlcXVlc3RzKSJ9"}


可以看到，开启了 thunder lock 之后，性能有所恢复。是不是有了锁之后，我们就可以随便开大进程数了呢？答案是否定的。我们在下一篇谈这个问题。


{"widget":"qards-section-heading","config":"eyJ0eXBlIjoicHJpbWFyeSIsInRpdGxlIjoi5aSa57q/56iLIn0="}


刚刚我们谈到了 Python 的 GIL，那为什么我还要在这里说多线程呢？因为你的代码实际上并不一定是 CPU-bound 的，而进程上下文切换的成本比线程高多了，所以并不一定进程开的越多越好，具体的参数还是要慢慢尝试调整。在设置了 threads = 2 后，测试出来的吞吐量反而下降了一点：


{"widget":"qards-code","config":"eyJjb2RlIjoiUmVxdWVzdHMgcGVyIHNlY29uZDogICAgMTUwOC4zMiBbIy9zZWNdIChtZWFuKVxuVGltZSBwZXIgcmVxdWVzdDogICAgICAgNTU3LjAwNCBbbXNdIChtZWFuKVxuVGltZSBwZXIgcmVxdWVzdDogICAgICAgMC41NTcgW21zXSAobWVhbiwgYWNyb3NzIGFsbCBjb25jdXJyZW50IHJlcXVlc3RzKSJ9"}


不过这也很正常，因为每一次的测试都是有波动范围的。**以上的测试结果中的第一项（requests per second）实际上不是原始的数据，而是我运行 5 次平均后的结果。**尽管平均值一定程度上让数据更加可靠，但我仍然不清楚我是否应该舍弃异常高的值（并且我不清楚为何这么高的吞吐量只出现了一次）：

```
2132.08 1325.72 1795.32 1381.67 1283.08 1399.98 1488.05
```


{"widget":"qards-section-heading","config":"eyJ0eXBlIjoicHJpbWFyeSIsInRpdGxlIjoi57uT6K66In0="}


就如本文开头说明的一样，本次优化侧重于 uWSGI 的调优而非代码本身。其实代码里会有很多可以改进的地方，我们下一篇再谈。今天最大的发现就是：worker 数量不是拍脑门定的，要针对实际性能（容器的资源限制）来测试，找到最佳 worker 数。


{"widget":"qards-divider","config":"eyJ0eXBlIjoiYnVsbGV0cyJ9"}


这是本系列的第一篇文章，其他文章：


{"widget":"qards-reference","config":"eyJyZWZlcmVuY2UiOiLmiJHlpoLkvZXlr7kgdVdTR0kg6L+b6KGM5oCn6IO96LCD5LyY77yIMu+8ie+8muiuvuWumiB3b3JrZXIg5pWw6YePIn0="}



{"widget":"qards-reference","config":"eyJyZWZlcmVuY2UiOiLmiJHlpoLkvZXlr7kgdVdTR0kg6L+b6KGM5oCn6IO96LCD5LyY77yIM++8ie+8muS9v+eUqOWNj+eoiyJ9"}
