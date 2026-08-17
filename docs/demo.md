# JLC EDA Agent 功能演示

> 以下展示插件当前已实现的核心能力。每张截图占位符请替换为实际截图路径。

## 1. 项目定位

基于嘉立创 EDA 专业版扩展 API 的 AI 插件，通过自然语言对话完成：

- **读原理图**：快速理解当前页或全工程的器件与网络关系。
- **审设计**：结合 DRC 与网表，辅助发现连接、参数与规范性问题。
- **辅助修改**：修改器件属性、删除冗余器件，操作前均经用户确认。

## 2. 安装与配置

在 JLCEDA Pro 中导入 `build/dist/jlc-eda-agent_v0.1.0.eext`，打开设置页配置模型与 API Key。

![模型配置页](screenshots/model-config.png)

## 3. 核心功能演示

### 3.1 读取当前页原理图

输入：

```text
帮我看看当前页的原理图
```

插件调用 `schematic_read` 读取当前激活页，输出电路结构、器件清单与连接关系。

![当前页读取](screenshots/schematic-read.png)

### 3.2 全工程设计审查

输入：

```text
审查一下这个设计有没有问题
```

插件调用 `schematic_review` 读取全工程网表与 DRC 结果，给出跨页审查报告。

![设计审查](screenshots/schematic-review.png)

### 3.3 修改器件参数

输入：

```text
把 R1 从 10k 改成 4.7k
```

插件调用 `component_modify` 直接修改目标器件属性。

![修改器件参数](screenshots/component-modify.png)

### 3.4 删除冗余器件

输入：

```text
R3 是冗余器件，把它删掉
```

插件调用 `component_delete` 定位器件并弹出确认面板，用户确认后执行删除。

![删除器件确认](screenshots/component-delete.png)

### 3.5 器件搜索与交互放置

输入：

```text
帮我找一个 10uF/0603 的陶瓷电容并放到图里
```

插件先调用 `component_select` 展示候选器件，再调用 `component_place` 引导用户在原理图中点击放置。

![器件搜索与放置](screenshots/component-select-place.png)

## 4. 技术亮点

- **Tool-Use Loop**：LLM 通过白名单工具逐步完成任务，而不是直接生成代码。
- **读写闭环**：从读取、审查到修改、删除，覆盖原理图辅助设计的完整流程。
- **人机确认**：器件删除、交互放置等敏感操作均先弹面板，由用户最终确认。
- **Anthropic 风格 UI**：温润橙色调，界面清爽，适合长时间调试使用。

## 5. 仓库与产物

- GitHub：https://github.com/metrogg/jlc-eda-agent
- 安装包：`build/dist/jlc-eda-agent_v0.1.0.eext`
