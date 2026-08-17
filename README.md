# JLC EDA Agent

AI 电路读图与优化助手 —— 让 AI 帮你读懂、审查、优化原理图设计。

基于嘉立创 EDA 专业版扩展 API 开发，采用 Tool-Use Loop 架构（类似 Claude Code），通过自然语言对话完成电路理解、设计审查与自动优化。

## 核心能力

### 读图解读
打开任意原理图，AI 自动解读：
- 电路整体结构与功能识别
- 器件清单与每个器件的作用
- 信号流向与网络连接关系
- 关键设计参数分析

### 设计审查
AI 检查设计问题：
- 基础检查：短路、悬空引脚、未连接网络
- 参数检查：电阻值、电容容量是否合理
- 设计规范：去耦电容、保护电路是否齐全
- 可制造性：器件常用度、封装标准度

### 优化迭代
自然语言描述改进需求，AI 自动修改：
- 替换器件（搜索 → 选型 → 放置 → 连线）
- 调整参数（修改电阻值、电容值等）
- 删除冗余器件
- 重新连线

## 技术架构

```
UI 层（iframe 聊天界面）
    ↓
Agent 循环层（Tool-Use Loop）
    ↓
LLM 适配层（OpenAI / Anthropic / DeepSeek）
    ↓
工具执行层（超时保护 + 路由 + 白名单）
    ↓
工具实现层（9 个工具）
    ↓
EDA API 层（eda.* 命名空间）
```

## 工具集

| 工具 | 功能 | 交互 |
|------|------|------|
| `schematic_read` | 读取当前页原理图 | 否 |
| `schematic_review` | 读取全工程网表 | 否 |
| `component_search` | 搜索立创商城器件 | 是（选型面板） |
| `component_place` | 自动放置器件到坐标 | 否 |
| `component_modify` | 修改器件属性 | 否 |
| `component_delete` | 删除器件 | 否 |
| `wire_create` | 创建导线 | 否 |
| `net_flag_create` | 创建网络标识 | 否 |
| `todo_list` | 任务管理 | 否 |

## 开始使用

1. 在嘉立创 EDA 专业版安装并启用插件。
2. 打开顶部菜单 `JLC EDA Agent`，选择 `设置`。
3. 选择平台，填写 `API Key` 和 `Model`。
4. 点击 `验证配置`，通过后点击 `保存`。
5. 选择 `聊天`，开始使用。

## 支持的模型平台

- DeepSeek
- 智谱（GLM）
- 阿里（通义）
- MiniMax
- OpenAI 兼容（自定义兼容 OpenAI 接口的模型）
- Anthropic 兼容（自定义兼容 Anthropic 接口的模型）

## 开发

```bash
# 安装依赖
npm install

# 编译
npm run compile

# 打包成 .eext
npm run build
```

构建产物在 `build/dist/` 目录下，可在嘉立创 EDA 扩展管理器中安装。

## 技术栈

- TypeScript
- esbuild
- 嘉立创 EDA 专业版扩展 API（@jlceda/pro-api-types）

## 致谢

本项目基于 [JLCEDA-Design-Copilot](https://github.com/sengbin/JLCEDA-Design-Copilot) 改造，感谢原作者的开源贡献。

## 许可证

[Apache License 2.0](LICENSE)
