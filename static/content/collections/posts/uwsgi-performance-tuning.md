---
title: 我如何对 uWSGI 进行性能调优
created_at: 2018-11-21T14:43:21.767Z
tags:
  - uWSGI
  - web
  - Python
authors: Frederic Chan
categories: Admirable Insight
meta:
  keywords: uWSGI Python web
isPage: false
isFeatured: false
hero:
  image: /images/uploads/marko-blazevic-219788-unsplash.jpg
excerpt: >-
  uWSGI 是 Python Web
  世界里广泛采用的应用服务器。它的配置非常复杂，如果要用于生产环境，有很多东西值得细细了解。本篇文章作为自己进行性能调优的记录。
---
最近看了一篇文章（<https://blog.codeship.com/getting-every-microsecond-out-of-uwsgi/>），看完之后随手测试了一下每课服务器端的性能。不测不知道，一测吓一跳，课表查询的 QPS 只有 30/s 左右。虽然似乎并不太影响用户的实际使用，但是这个性能显然有点太惨了，于是开始尝试对性能进行 tuning。

因为每课的业务逻辑是大一刚入学的时候写的，那时候知识量比较有限，所以基本是一个“又不是不能用”的情况，性能不会特别好。考虑到我们已经重新设计了一套新的数据库结构、并且课表查询相关的业务逻辑即将迁移到专门的微服务内进行，这个时候再花时间去改老的业务逻辑不是特别必要，因此本次优化的基本思路是：先优化 uWSGI 相关的，再优化（实在看不过去的）业务逻辑。

在明确了这个目标之后，考虑到健康检查页面（/_healthCheck）是一个没有数据库查询、甚至没有任何业务逻辑直接返回 JSON 的 endpoint，我选择了它作为优化 uWSGI 时测试的对象。（通常来说，你可能希望在健康检查的 endpoint 中加入检查数据库连接等逻辑，但在目前版本的每课 Server 中，我们仅仅直接返回了一个`{"status": "ok"}` 的 JSON）

> 实际情况比我上面的描述略微复杂一点：我们的 Flask 程序中有个 `before_request` 钩子，在请求开始处理前标识每个独立用户，这个过程会访问数据库获取唯一 ID，但因为我们测试的是数据库无关的性能问题，因此我临时把这个功能去掉了）

{"widget":"qards-section-heading","config":"eyJ0aXRsZSI6IlByZXBhcmF0aW9ucyBiZWZvcmUgc3RhcnQgdHVuaW5nIiwidHlwZSI6InByaW1hcnkifQ=="}

{"widget":"qards-section-heading","config":"eyJ0eXBlIjoic2Vjb25kYXJ5IiwidGl0bGUiOiJNZWFzdXJpbmcgdGhlIGJhc2VsaW5lIn0="}

首先贴一下 tuning 之前的 uwsgi.ini：

{"widget":"qards-code","config":"eyJsYW5ndWFnZSI6ImluaSIsImNvZGUiOiJbdXdzZ2ldXG5jaGRpciA9IC92YXIvZXZlcnljbGFzcy1zZXJ2ZXJcbnZlbnYgPSAudmVudlxucHl0aG9ucGF0aCA9IC92YXIvZXZlcnljbGFzcy1zZXJ2ZXJcblxuIyBsYXVuY2hlclxud3NnaS1maWxlID0gZWNfc2VydmVyLnB5XG5jYWxsYWJsZSA9IGFwcFxuXG4jIHdvcmtlcnNcbm1hc3RlciA9IHRydWVcbnByb2Nlc3NlcyA9IDRcbnRodW5kZXItbG9jayA9IHRydWVcbmxhenktYXBwcyA9IGZhbHNlXG5cbiMgZGVzdHJveSBzdHVja2VkIHByb2Nlc3Nlc1xuaGFyYWtpcmkgPSAzMFxuXG4jIHRocmVhZGluZyBzdXBwb3J0XG5lbmFibGUtdGhyZWFkcyA9IHRydWVcblxucGx1Z2lucyA9IC91c3IvbG9jYWwvbGliL3V3c2dpL3B5dGhvbjM3XG5cbiMgdG91Y2ggdG8gcmVsb2FkXG50b3VjaC1yZWxvYWQgPSAvdmFyL2V2ZXJ5Y2xhc3Mtc2VydmVyL3JlbG9hZFxuXG4jIHVzZSBtZWFuaW5nZnVsIG5hbWVcbmF1dG8tcHJvY25hbWUgPSB0cnVlXG5cbiMgaGFuZGxlIHVXU0dJIHdyaXRlIGVycm9yXG5pZ25vcmUtc2lncGlwZSA9IHRydWVcbmlnbm9yZS13cml0ZS1lcnJvcnMgPSB0cnVlXG5kaXNhYmxlLXdyaXRlLWV4Y2VwdGlvbiA9IHRydWUifQ=="}

我们先用这个配置跑出一个成绩作为后续调优的 baseline：

```bash
$ ab -c 50 -n 5000 -s 90 http://127.0.0.1/_healthCheck
```

结果如下：

{"widget":"qards-code","config":"eyJjb2RlIjoiUmVxdWVzdHMgcGVyIHNlY29uZDogICAgNzI5LjY1IFsjL3NlY10gKG1lYW4pXG5UaW1lIHBlciByZXF1ZXN0OiAgICAgICA2OC41MjYgW21zXSAobWVhbilcblRpbWUgcGVyIHJlcXVlc3Q6ICAgICAgIDEuMzcxIFttc10gKG1lYW4sIGFjcm9zcyBhbGwgY29uY3VycmVudCByZXF1ZXN0cykifQ=="}

{"widget":"qards-section-heading","config":"eyJ0eXBlIjoic2Vjb25kYXJ5IiwidGl0bGUiOiJBZGp1c3QgYG5ldC5jb3JlLnNvbWF4Y29ubmAgcGFyYW1ldGVyIn0="}

尝试改大并发量，这时候出现了问题：

{"widget":"qards-code","config":"eyJjb2RlIjoiQmVuY2htYXJraW5nIDEyNy4wLjAuMSAoYmUgcGF0aWVudClcbkNvbXBsZXRlZCA1MDAgcmVxdWVzdHNcbkNvbXBsZXRlZCAxMDAwIHJlcXVlc3RzXG5Db21wbGV0ZWQgMTUwMCByZXF1ZXN0c1xuQ29tcGxldGVkIDIwMDAgcmVxdWVzdHNcbkNvbXBsZXRlZCAyNTAwIHJlcXVlc3RzXG5Db21wbGV0ZWQgMzAwMCByZXF1ZXN0c1xuQ29tcGxldGVkIDM1MDAgcmVxdWVzdHNcblxuVGVzdCBhYm9ydGVkIGFmdGVyIDEwIGZhaWx1cmVzXG5hcHJfc29ja2V0X2Nvbm5lY3QoKTogQ29ubmVjdGlvbiByZXNldCBieSBwZWVyICg1NCkifQ=="}

Google 了一下，发现问题在于没有 `accept()` 的请求太多了，超过了系统默认的最大值128（这个值对于生产环境的 Web 服务器来说太小了），因此内核直接重置了连接。在基于 Kubernetes 的生产环境中，在 Pod 的 template 中加入 `"security.alpha.kubernetes.io/unsafe-sysctls": "net.core.somaxconn=4096"` 即可。（需要先配置节点上的 kubelet，允许 `net.core.somaxconn`这个 unsafe sysctl，配置方法可参考 <http://bazingafeng.com/2017/12/23/kubernetes-uses-the-security-context-and-sysctl/>。原先我以为修改了宿主的内核参数就可以了，但是后来发现 Docker 对这个参数好像有隔离）

由于我在本地测试的使用使用的是 docker-compose，因此需要把这个参数加入到 `docker-compose.yml` 中：

{"widget":"qards-code","config":"eyJjb2RlIjoidmVyc2lvbjogXCIzXCJcbnNlcnZpY2VzOlxuICBldmVyeWNsYXNzLXNlcnZlcjpcbiAgICBpbWFnZTogZXZlcnljbGFzcy1zZXJ2ZXI6bGF0ZXN0XG4gICAgc3lzY3RsczpcbiAgICAtIG5ldC5jb3JlLnNvbWF4Y29ubj00MDk2XG4gICAgZW52aXJvbm1lbnQ6XG4gICAgICBNT0RFOiBERVZFTE9QTUVOVFxuICAgIHBvcnRzOlxuICAgIC0gODA6ODAiLCJsYW5ndWFnZSI6InlhbWwifQ=="}

除了内核的限制之外，还有 uWSGI 本身的限制。因此，在 uWSGI 配置文件中加入：`listen = 4096`（即监听队列长度为 4096），现在启动 uWSGI 时你可以看到 `your server socket listen backlog is limited to 4096 connections` 的字样，表明设置成功了。（如果这个值设置的比系统最大值大，会导致 uWSGI 无法启动）

{"widget":"qards-section-heading","config":"eyJ0eXBlIjoicHJpbWFyeSIsInRpdGxlIjoiRGlzYWJsZSBMb2dnaW5nIn0="}

我们来尝试一些邪门的小技巧吧，比如关闭 uWSGI 的访问日志。关闭它对我们不会产生多大的影响，因为生产环境中在反向代理处会有日志，而在开发环境中，无用的访问日志会淹没重要的报错信息。在 uWSGI 的配置文件中加入 `disable-logging = True` ，然后我们再来测试一下性能：

{"widget":"qards-code","config":"eyJjb2RlIjoiUmVxdWVzdHMgcGVyIHNlY29uZDogICAgOTY5LjEwIFsjL3NlY10gKG1lYW4pXG5UaW1lIHBlciByZXF1ZXN0OiAgICAgICAxMDMuMTg5IFttc10gKG1lYW4pXG5UaW1lIHBlciByZXF1ZXN0OiAgICAgICAxLjAzMiBbbXNdIChtZWFuLCBhY3Jvc3MgYWxsIGNvbmN1cnJlbnQgcmVxdWVzdHMpIn0="}

老实说，在测试之前我并不太相信关闭日志会对性能造成多大的提升。但结果表明，关闭日志将性能提升了 30%。

{"widget":"qards-section-heading","config":"eyJ0eXBlIjoicHJpbWFyeSIsInRpdGxlIjoiQWRkIG1vcmUgd29ya2VycyJ9"}

在性能不够时，增加 worker 是一个很常见的思路。我们当前的配置只有 4 个进程（每个进程中一个线程），这意味着如果 4 个 worker 都在忙碌，程序就会暂时卡住。当然，比这更糟糕的是，如果代码出现了死循环，并且这段死循环代码在全部 worker 中执行，并且你没有设置 `harakiri` 参数，你的程序会永久卡住，除非你强行重启 uWSGI。

我们增加 worker 数量到 10，然后再次测试：

（测试结果）

那么继续改大 worker 数量，能不能让吞吐量继续提升呢？我们把 worker 数量改到 100，然后进行测试：

（测试结果）

测试的结果令我们有点惊讶，增大 worker 数量到 100 之后，吞吐量不升反降了。这是为什么呢？欢迎来到惊群问题（thundering the herd）：

惊群简单来说就是多个进程或者线程在等待同一个事件，当事件发生时，所有线程和进程都会被内核唤醒。唤醒后通常只有一个进程获得了该事件并进行处理，其他进程发现获取事件失败后又继续进入了等待状态。监听同一个事件的进程数越多，争用 CPU 的情况越严重（尽管实际上只有一个进程能成功获得事件并进行处理），造成了严重的上下文切换成本。

内核的设计者并不傻。在 Linux 2.6 以后，多个进程监听一个文件描述符的 `accept()` 操作，内核会防止出现惊群问题。

{"widget":"qards-section-heading","config":"eyJ0eXBlIjoicHJpbWFyeSIsInRpdGxlIjoiTXVsdGl0aHJlYWRpbmcifQ=="}
