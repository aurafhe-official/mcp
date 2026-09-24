# AURA MCP

**连接 AI 助手与 Aura 密文计算工具，从实际应用理解 FHE 的价值。**

FHE（全同态加密）让软件能够对加密状态的数据进行计算。Aura AI 是这一基础
计算层的应用；MCP 负责把你的助手连接到当前开放的能力。

**Aura 官网报告：GPT-OSS-20B 在一张 RTX PRO 6000 Blackwell GPU 上实现
20+ tokens/second 的加密推理，提示词读入低于 2.3 秒。** 这是 Aura 的内部
基准，不是本 MCP 测得的速度，也不是独立验证结果。
[官网来源](https://afhe.io/#status) · [English](README.md)

| 你的目标 | 入口 |
| --- | --- |
| 了解 AI 应用与业务示例 | [Aura AI 演示指南](docs/AI-DEMO.md) |
| 连接 Cursor、Claude Desktop 或 VS Code | [安装步骤](docs/QUICKSTART.md) |
| 学习密文计算 | 连接后选择公开样例课程 |

AI 应用独立访问，**当前 MCP 没有模型推理工具**。它提供密文数值计算、应用
介绍和证据说明。Aura 确认 FHE 数据库与 FHE-AI 大模型推理应用已完成，可通过
**gen@afhe.io** 申请独立演示。

## 安装并开始

安装 [Node.js 20+](https://nodejs.org/en/download)，在 Windows PowerShell
或 macOS/Linux 终端执行：

```sh
npm install -g @aurafhe/mcp@preview
aura-fhe-mcp --config cursor --demo
```

其他客户端将 `cursor` 换成 `claude` 或 `vscode`。把生成的配置加入客户端，
保留其他连接并重启。无需 Git、npm 账号、本地计算引擎或演示密钥配置。
请在运行 MCP 的电脑上生成配置；云端工作区的绝对路径不能直接复制到本机。
当前版本 **0.5.0-rc.7**，固定安装可使用 `@aurafhe/mcp@0.5.0-rc.7`。
升级时重新安装、生成配置并完整重启客户端。[配置位置](docs/QUICKSTART.md)。

向助手说：

> Aura 能帮我做什么？先介绍 AI 应用，再说明我在这个连接里可以运行什么。

助手先解释应用和官网基准，然后提供应用演示、学习课程或开发工具三个入口。
支持 MCP 提示词的客户端可选择 **What can I do with Aura?**（`aura_demo`）。
应用概览不调用后端，也不会自动开始数值计算。

## 当前可执行的能力

- 密文整数和浮点数的加、减、乘、除。
- 组合求和、乘积、浮点均值和加权和。
- 操作发现、请求耗时与密文结果导出。

数值计算本身就是 FHE 的应用。二进制支持是后续能力里程碑；数据库、检索和
模型推理不是当前 MCP 的可执行工具。[接口说明](docs/PROTOCOL.md)。

## 可选学习课程

> 用公开样例带我学习 Aura 密文计算，每一步都解释清楚。

助手使用 `aura_start` 的 `experience: "learn"`：解释原理、准备加密样例、
请求计算并保存加密结果。第一例是 25 与 17 相加，预期为 42；MCP 返回密文，
独立合成数据验证脚本在对话之外核对真实数值。另有 7.5、2.5、2 可练习均值。
支持提示词的客户端可选择 `aura_learn`。无需复制标识符或管理密钥。

**公开样例模式：** Aura 管理演示密钥并能够解密演示数据。请使用公开样例；
机密部署需要验证密钥归属与访问控制。在助手中输入的内容对该助手服务商可见。
[验证记录](docs/VERIFICATION.md) · [安全模型](docs/SECURITY-MODEL.md)

本包公开连接层；专有计算实现保留在服务端。运维密文文件接入需要认证计算
节点及独立接收方流程，不等于 Verified 模式。参考分支独立于本次发布。
