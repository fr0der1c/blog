---
title: SSL/TLS 配置优化的若干建议
created_at: 2018-01-27T14:43:21.767Z
tags:
  - Security
  - SSL
  - TLS
authors: Frederic Chan
categories: Security
meta:
  keywords: ssl tls security
isPage: false
isFeatured: false
hero:
  image: /images/uploads/key-3348307_1280.jpg
excerpt: >-
  “如果你配置 SSL
  只是为了网站的网址前有一把锁的标志，那不如直接送你把锁好了”。别想了，这句话不是哪个安全专家说的，是我说的（逃）今天写一篇文章记录一下自己 SSL
  的配置优化过程。
---
以下设置均为 Nginx 的配置。

## Forward Secrecy（前向加密）

forward secrecy 也称之为 perfect forward secrecy，或者 PFS。称之为完美远期加密。是在HTTPS基础上进一步保护用户电脑同服务器之间的加密通讯。

其解决的一个安全场景就是，如果服务器同用户间的加密通讯内容被窃听，也被储存下来，这些被加密的内容虽然当时无法被解密，被破解，但是当日后，服务器的SSL密钥被取得后（不管是何种原因被取得密钥），这些过往的内容是可以用这个密钥来解密的。这样虽然时效性可能差些，但是仍然是会有被破解的危险存在。

而采用 完美远期加密 的 SSL 或者 HTTPS 通讯，加密钥匙只是短暂性的，而且不能从服务器的 SSL 密钥中推算出来，这样即使日后 SSL 密钥被第三方取得，过去和未来的 HTTPS 通讯仍然安全，窃听者始终无法破解所窃听的内容（以目前的技术而言）。

目前只有用 ephemeral Diffie-Hellman 的算法才算是完美远期加密。

### 配置方法

在终端运行（建议把这个 Diffie-Hellman 参数文件和证书放在一起）：

```
 openssl dhparam -out dh4096.pem 4096
```

一些人认为，4096 比特过长了，会给系统的处理器带来不必要的负担；但是就现在的计算能力而言，这似乎值得一试。这个值可以自行更改。建议 2048。

在 Nginx 的配置文件中加入：

```nginx
ssl_dhparam dh4096.pem;
```

之后restart **（NOT reload）** Nginx。

- - -

## HSTS（HTTP Strict Transport Security，严格传输安全）

HSTS 简单说就是在一定时间内强制客户端使用 HTTPS 访问页面。原理如下：

* 在服务器响应头中添加 `Strict-Transport-Security`，可以设置 `max-age`
* 用户访问时，服务器种下这个头
* 下次如果使用 HTTP 访问，只要 `max-age` 未过期，客户端会进行内部跳转，可以看到 307 Redirect Internel 的响应码（注意是**客户端浏览器相应的**，这里给服务器省下了一次 302 跳转）
* 变成 HTTPS 访问源服务器

这个过程有效避免了中间人对 80 端口的劫持。但是这里存在一个问题：如果用户在劫持状态，并且没有访问过源服务器，那么源服务器是没有办法给客户端种下 Strict-Transport-Security 响应头的（都被中间人挡下来了）。如何解决？请自行谷歌 HSTS preload。

需要注意的是，**只有启用 preload 之后才是严格意义上安全的 HTTPS**。否则都可能在最薄弱环节被攻破。比如：

* 允许 SSL 连接但不强制从 HTTP 跳转到 HTTPS，用户访问 HTTP 被劫持
* 部署了 HSTS，但用户**第一次访问**是 HTTP 的，Strict-Transport-Security 的响应头没有作用的机会，还是被劫持

不过，即使你启用了 preload 也不是 100% 高枕无忧了，**一旦客户端被恶意软件安装了恶意的根证书，这些措施就都没有用了**。所以不要轻易安装根证书，不要随意安装可疑软件（尤其在 Windows 上）。比如，Google 曾在
 2015 年报告说 **CNNIC （中国互联网络信息中心）签发的一个中级 CA 签发了一个伪造的 Google 证书**，从而导致 Google 和 Mozilla 在其产品中取消了对 CNNIC 后继签发的证书信任。

如何解决呢？请看后文的 **HPKP**。

### 开启 HSTS

```nginx
add_header Strict-Transport-Security "max-age=6307200; includeSubdomains; preload";
```

以上语句开启了 HSTS，并设置有效期为“6307200秒”（6个月），包括子域名(根据情况可删掉)，预加载到浏览器缓存(根据情况可删掉，注意加入后需要向 hstspreload.org 提交申请)。

注意如果要申请preload，所有子域名都必须使用 HTTPS，且`max-age`至少设置为一年。有关preload的更多信息可以前往上述网址查看。

**提醒一下，只有443端口的监听需要设定 HSTS，80端口不需要增加 header。**

- - -

## HPKP（Public Key Pinning，公钥固定）

公钥固定（Public Key Pinning）是指一个**证书链中必须包含一个白名单中的公钥，也就是说只有被列入白名单的证书签发机构（CA）才能为某个域名*.example.com签发证书**，而不是你的浏览器中所存储的任何 CA 都可以为之签发。

> 用你使用的银行做个例子，它一直使用 CA 公司 A 为其签发证书。但是在当前的证书体系下，CA 公司 B、CA 公司 C 和 NSA 的 CA 都能给你的银行创建证书，而你的浏览器会毫无疑虑的接受它们，因为这些公司都是你所信任的根 CA。
>
> 如果你的银行实现了 HPKP 并固定了它们的第一个中级证书（来自 CA 公司 A），那么浏览器将不会接受来自CA 公司 B 和 CA 公司 C 的证书，即便它们也有一个有效的信任链。HPKP 也允许你的浏览器将这种违例行为报告给该银行，以便银行知道被伪造证书攻击了。

听起来很美好。不过：

* **仍然有严重安全隐患**——恶意攻击者可以伪造 HPKP 头进行拒绝访问攻击
* **错误的部署会为网站带来严重的后果**——用户在相当长一段时间内（取决于max-age的配置）因新证书公钥与旧HPKP策略不符，会导致用户对网站的合法访问变成拒绝访问
* **一定程度上破坏行业生态**——吊销旧证书后再请求签发新证书只能选择此前固定的 CA 机构，你不能再选择新的CA 机构为你签发证书

基于以上种种原因，这项谷歌发起的计划在 2017 年 10 月又被谷歌自己抛弃，并计划于 2018 年 5 月在 Chrome 浏览器中移除对 HPKP 的支持。详细情况可以[参见报导](https://www.landiannews.com/archives/41904.html)。因此，**现在没有必要给网站添加对于 HPKP 的支持了**。

- - -

## DNS CAA 保护

HPKP 废弃之后，是不是就没有办法了呢？好在有 DNS CAA （DNS Certification Authority Authorization，DNS证书颁发机构授权）保护。

DNS CAA 保护可以使域持有人可以**指定允许为其域签发证书的 CA**。它会在 DNS 下发 IP 的同时，**同时下发一条资源记录，标记该域名下使用的证书必须由某证书颁发机构颁发**。比如本站使用了 Let's Encrypt 颁发的免费证书，我可以同时使用 CAA 技术标记本站使用的 SSL 证书必须由 Let's Encrypt 颁发，这样就可以（在一定程度上）解决上面所述的问题。

并不是所有 DNS 服务器都支持 CAA 保护，支持 CAA 记录的国外 DNS 服务这里有比较详细的记录：https://sslmate.com/caa/support 。国内的话，我使用的 CloudXNS 是支持的。

### 开启方法

在你的 DNS 服务的后台添加一条 CAA 记录：

* Name 可以直接填写顶级域名，会自动应用到多级域名
* CAA data 填写 `0 issue "证书颁发机构域名"`，如果你用 Let's Encrypt 颁发的免费证书，CAA data 部分直接填写 `0 issue "letsencrypt.org"` 即可。
* 你还可以添加一条为 `0 iodef "mailto:你的邮箱"` 的 CAA 记录，表示如果发现违背 CAA 记录的情况给这个邮箱发邮件通知

- - -

## SSL/TLS 协议版本

SSL v2 及以下已经不安全了，请使用 TLS v1 以上版本（TLS 协议是在 SSL v3 协议基础上设计的）。之所以把 SSL v3 也关了是因为 TLS 1.0 会被降级攻击，降级到 SSL v3 之后，我们之前提到的 Forward Secrecy（前向加密）就失效了。另外， SSL v3 存在 POODLE 漏洞，这是关闭它的另一个主要理由。

```nginx
ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
```

以上语句只允许使用 TLS 协议。

- - -

## 弃用不安全的加密套件

```nginx
ssl_ciphers EECDH+CHACHA20:EECDH+CHACHA20-draft:EECDH+AES128:RSA+AES128:EECDH+AES256:RSA+AES256:EECDH+3DES:RSA+3DES:!MD5;

ssl_prefer_server_ciphers on; 
# 缓解 BEAST 攻击
# 在 SSLv3 or TLSv1 握手时，通常会使用客户端的cipher偏好，打开这个选项后，则会使用服务器的偏好
```

这里使用的是 CloudFlare's Internet facing SSL cipher configuration。

cipher 之间用冒号分隔，cipher 前有感叹号的表示必须废弃。以下是必须废弃的：

> * aNULL contains non-authenticated Diffie-Hellman key exchanges, that are subject to Man-In-The-Middle (MITM) attacks
> * eNULL contains null-encryption ciphers (cleartext)
> * EXPORT are legacy weak ciphers that were marked as exportable by US law
> * RC4 contains ciphers that use the deprecated ARCFOUR algorithm
> * DES contains ciphers that use the deprecated Data Encryption Standard
> * SSLv2 contains all ciphers that were defined in the old version of the SSL standard, now deprecated
> * MD5 contains all the ciphers that use the deprecated message digest 5 as the hashing algorithm

如果不手动指定加密套件会怎样呢？有关 Nginx 默认算法的安全性，引用官网的一段文字：

> Since version 1.0.5, NGINX uses **ssl_protocols SSLv3 TLSv1** and ssl_ciphers **HIGH:!aNULL:!MD5** by default; since versions 1.1.13 and 1.0.12, the default was updated to **ssl_protocols SSLv3 TLSv1 TLSv1.1 TLSv1.2**.
>
> Vulnerabilities are sometimes found in the design of older ciphers, and you would be wise to disable these in a modern NGINX configuration (**unfortunately, the default configuration cannot easily be changed because of concerns of backward compatibility for existing NGINX deployments**). Please note that CBC-mode ciphers might be vulnerable to a number of attacks, the BEAST attack in particular (see CVE-2011-3389), and SSLv3 is best avoided unless you need to support legacy clients due to the POODLE attack.

请注意，加密套件的选择和你证书是有关的。比如如果你使用了ECC+RSA双证书，你应该使用如下配置（否则其中一个证书可能不工作）：

```nginx
ssl_ciphers EECDH+CHACHA20:EECDH+ECDSA+AESGCM:EECDH+ECDSA+SHA384:EECDH+ECDSA+SHA256:EECDH+AES128:RSA+AES128:EECDH+AES256:RSA+AES256:EECDH+3DES:RSA+3DES:!MD5;  
```

- - -

## OSCP Stapling

当我们通过HTTPS访问网站的时候，客户端会通过证书颁发机构的证书吊销列表（CRL）或者数字证书在线状态协议(OCSP)记录验证网站服务器的证书是否有效。前一种验证方式是最低效的，CA会不断向CRL文件添加证书吊销记录，CRL文件就会变得越来越大，客户端在验证前就需要耗费越来越长的时间来下载CRL文件。

相比 CRL 验证方式，OCSP 就更加高效，OCSP 每次只查询并获取一条记录。然而这些默认查询 OCSP 的客户端在获得查询结果的响应前势必会一直阻塞后续的事件，在网络情况堪忧的情况下（尤其是大陆地区）会造成较长时间的页面空白。并且一旦有黑客或者组织对CA的OCSP发动DDos攻击，客户端便无法从 OCSP 服务器获取查询结果并完成证书验证, 客户端就可能会提示网站不受信任。

而 OCSP Stapling ，顾名思义，是**将查询 OCSP 接口的工作交给服务器来做**，服务器除了可以直接查询 OCSP 信息，还可以仅进行少数次查询并将响应缓存起来。当有客户端向服务器发起 TLS 握手请求时，服务器将证书的 OCSP 信息随证书链一同发送给客户端，从而避免了客户端验证会产生的阻塞问题。由于 OCSP 响应是无法伪造的，因此这一过程也不会产生额外的安全问题。

值得注意的是：Nginx会在客户端的HELLO握手信息中返回OCSP记录，并且只有当客户端对Nginx发出OCSP信息请求的情况下，Nginx才会发送缓存的OCSP 权威记录到客户端。

```nginx
ssl_stapling on;
# OCSP Stapling 开启。OCSP是用于在线查询证书吊销情况的服务，使用OCSP Stapling能将证书有效状态的信息缓存到服务器，提高 TLS 握手速度

ssl_stapling_verify on; 
# OCSP Stapling 验证开启

ssl_trusted_certificate /etc/nginx/cert/trustchain.crt; 
# OCSP Stapling 的证书位置（完整的证书链）

resolver 233.5.5.5 233.6.6.6 valid=300s; 
# 用于查询 OCSP 服务器的DNS

resolver_timeout 5s;
#查询域名超时时间
```

注意上述 DNS 是阿里云的，如果不信任的话可以改成 Google 的：`8.8.8.8 8.8.4.4 [2001:4860:4860::8888] [2001:4860:4860::8844]`

- - -

## 缓存连接凭据

缓存 SSL 连接凭据可以避免频繁握手带来的速度降低和性能损耗。

TLS 协议有两类会话缓存机制：**会话标识 session ID** 与**会话记录 session ticket**。session ID 由服务器端支持，协议中的标准字段，因此基本所有服务器都支持，服务器端保存会话ID以及协商的通信信息，Nginx 中1M 内存约可以保存4000个 session ID 机器相关信息，占用服务器资源较多；而 session ticket 属于一个 TLS 扩展字段，需要服务器和客户端都支持。

二者对比，主要是保存协商信息的位置与方式不同，类似与 HTTP 中的 session 与 cookie。都存在的情况下，Nginx 优先使用 session_ticket。

```nginx
ssl_session_cache shared:SSL:20m; 
# SSL session 缓存区大小
# 这条语句加在server段里话，在SSL Lab的测试中识别不出来，因为它假设客户端不支持SNI协议，但实际上是可以加在server段的

ssl_session_tickets on;
# 开启浏览器的 Session Ticket 缓存

ssl_session_timeout 60m; 
# 过期时间，分钟
```

- - -

## 防止 MIME 类型混淆攻击

```nginx
add_header X-Content-Type-Options nosniff;
```

- - -

## 301 跳转

跳转到HTTPS，不多说了。

```nginx
server { 
    listen 80; 
    return 301 https://$host$request_uri; 
} 
```

- - -

## HTTP/2

尽管 HTTP/2 协议本身并不要求一定开启 SSL，但浏览器要求一定要启用 SSL 才能使用 HTTP/2。要使用 HTTP/2，把 listen directive 改成 `listen 443 ssl http2` 即可。HTTP/2 是 SPDY 的演进版本，性能上相比 HTTP 1.1 最主要的是增加了多路复用 multiplexing、header 压缩和二进制格式。

```nginx
server {
    listen 443 ssl http2;
    ...
}
```

可以在谷歌浏览器中打开 chrome://net-internals/#http2 以检查网站是否开启了 HTTP/2。

- - -

## SSL 测试

最后附上一个常用的测试网站SSL配置问题的网站：[SSL Server Test](https://www.ssllabs.com/ssltest/index.html)，你可以按照测试结果有针对性的进行优化。不过，不必追求满分。建议测试等级达到 A+、Certificate 100/100、Protocol Support 95/100、Key Exchange 90/100、Cipher Strength 90/100 即可。

不过，它的缓存测试并不假设客户端支持 SNI，所以即便你对某一个 virtual server 开启了 ssl session cache，依然会提示 `Session resumption (caching)No (IDs assigned but not accepted)`。[解决方法请看这里](https://stackoverflow.com/questions/22732045/session-cache-not-detected-in-nginx)。

- - -

## 参考资料

1. [更进一步的提高 SSL 的安全性，支持 Forward Secrecy](https://seo.g2soft.net/2015/02/27/enable-forward-secrecy.html)
2. [如何在NGINX网站服务器中实施SSL完美前向保密技术?](http://netsecurity.51cto.com/art/201408/447473.htm)
3. [你所不知道的 HSTS](http://www.barretlee.com/blog/2015/10/22/hsts-intro/)
4. [Nginx的SSL配置优化](https://www.linpx.com/p/ssl-configuration-optimization.html)
5. [在 Apache、NGINX 和 Lighttpd 上启用 HTTP 公钥固定扩展（HPKP）](https://linux.cn/article-5282-1.html)
6. [给你的站点添加 DNS CAA 保护](https://segmentfault.com/a/1190000011097942)
7. [Strong SSL Security on nginx](https://raymii.org/s/tutorials/Strong_SSL_Security_On_nginx.html)
8. [How do you score A+ with 100 on all categories on SSL Labs test with Let's Encrypt and Nginx?](https://stackoverflow.com/questions/41930060/how-do-you-score-a-with-100-on-all-categories-on-ssl-labs-test-with-lets-encry)
9. [从无法开启 OCSP Stapling 说起](https://imququ.com/post/why-can-not-turn-on-ocsp-stapling.html)
