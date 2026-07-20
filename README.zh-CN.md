# Education Agent Skills Library（教育 Agent 技能库）

[English](README.md) | **简体中文**

[![Agent Skills](https://img.shields.io/badge/Agent%20Skills-1.0-blue)](https://agentskills.io)
[![Skills](https://img.shields.io/badge/skills-165-blue)](https://github.com/GarethManning/education-agent-skills)
[![License: CC BY-SA 4.0](https://img.shields.io/badge/License-CC%20BY--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-sa/4.0/)
[![Last Commit](https://img.shields.io/github/last-commit/GarethManning/education-agent-skills)](https://github.com/GarethManning/education-agent-skills/commits/main)

一个开源技能库，包含横跨 20 个领域、以研究证据为基础的 165 项教学技能——支持 Claude Code、Claude.ai（通过 MCP）、OpenAI Codex 和 Hermes Agent，并专为 AI Agent 编排而设计。第 1–19 个领域面向教师与设计者；第 20 个领域则首次面向学生，提供可在学习过程中实时影响 AI 如何回应学习者的互动模式。

> [!NOTE]
> 本文是项目 README 的简体中文翻译。技能文件仍以英文版本为唯一标准来源，以避免版本分歧，并确保元数据、研究证据和引用保持一致。
>
> 使用支持中文的 AI 时，用户仍可直接用中文提出需求，并要求 AI 以中文返回结果，无需翻译技能文件本身。

> [!IMPORTANT]
> **托管 MCP 访问现在需要身份验证令牌。**
>
> 本技能库仍然免费且开源。我们仍建议优先采用本地安装、插件安装或手动使用等免费方式。托管 MCP 服务器继续面向确实需要远程 MCP 端点的用户提供服务，但为了让服务能够长期持续运行，现已停止匿名访问。
>
> **需要托管 MCP？** [申请访问令牌](https://docs.google.com/forms/d/e/1FAIpQLSdW1EdcmtjSPPq68Hx-bdth5hO2KNyjhAwEV9Ld0EwWL1Gr8Q/viewform)，或[跳转到托管 MCP 设置](#mcp-server)。

---

## 开始使用

本项目支持 Claude、Codex、Hermes Agent，以及任何兼容 Agent Skills 标准的工具。

为了获得可持续的免费使用体验，请尽可能从 GitHub 将技能安装或复制到本地。托管 MCP 服务器是为远程客户端提供的便捷入口，并非使用本技能库的必要条件。

### Claude

**CoWork（最简单）**——前往 **Customize → (+) Add Plugin**，然后粘贴：

```
https://github.com/GarethManning/education-agent-skills
```

**Claude Code CLI**——通过仓库 URL 安装：

```bash
claude plugin install https://github.com/GarethManning/education-agent-skills
```

**Claude.ai / Claude Desktop（托管 MCP）**——仅当你的工作流程确实需要远程 MCP 连接器时使用。托管访问需要令牌：

```text
https://mcp-server-sigma-sooty.vercel.app/mcp
```

在此申请令牌：[托管 MCP 访问申请](https://docs.google.com/forms/d/e/1FAIpQLSdW1EdcmtjSPPq68Hx-bdth5hO2KNyjhAwEV9Ld0EwWL1Gr8Q/viewform)。本地安装和手动使用仍然免费。详见[托管 MCP 访问说明](docs/HOSTED_MCP_ACCESS.md)。

### OpenAI Codex

Codex **不需要**托管 MCP 服务器。推荐使用以下本地安装方式：

```bash
git clone https://github.com/GarethManning/education-agent-skills.git
cd education-agent-skills
codex plugin marketplace add "$PWD"
```

仓库中的 Codex 插件清单位于 `.codex-plugin/plugin.json`，指向 `./skills/`；本地 marketplace 辅助配置位于 `.agents/plugins/marketplace.json`。安装并启用本地插件后，请重启 Codex。

如果只需要一两个技能，可将它们复制到 Codex 的全局技能目录：

```bash
mkdir -p ~/.codex/skills
cp -r skills/<domain>/<skill-name> ~/.codex/skills/
```

示例：

```bash
cp -r skills/memory-learning-science/spaced-practice-scheduler ~/.codex/skills/
```

完整 Codex 指南：[docs/CODEX.md](docs/CODEX.md)。

### Hermes Agent

Hermes 用户应将本仓库作为标准来源，然后只在本地安装自己实际需要的技能。

```bash
hermes skills tap add GarethManning/education-agent-skills
hermes skills install \
  GarethManning/education-agent-skills/skills/original-frameworks/learning-target-authoring-guide \
  --category education --yes
```

建议先安装经过挑选的技能或小型入门组合，而不是一次安装全部 165 项技能。这样可使本地 Hermes 索引保持实用，避免充斥无关内容。

如果你希望使用智能技能发现与推荐，而不是在本地或离线安装技能，可使用托管 MCP 服务器提供的 `find_skills` 和 `suggest_skills` 工具。MCP 访问方式与 Hermes tap 面向不同类型的用户，目前没有单独开发 Hermes 插件的计划。

完整 Hermes 指南：[docs/HERMES.md](docs/HERMES.md)。

### 任何兼容 Agent Skills 的工具

将 `skills/` 下的技能文件夹复制到你的 Agent 技能目录。每项技能都是一个包含 `SKILL.md` 的文件夹，其中带有 `name` 和 `description` 前置元数据——无需依赖项，也无需构建步骤。

### 手动使用（无需设置）

1. 打开仓库中的任意技能文件（位于 `skills/` 下）
2. 复制其中的提示词区块
3. 粘贴到任意 AI 中，并根据你的课程或使用情境填写相应字段

---

## 反馈与贡献

欢迎分享你的想法。如果你有建议、发现了问题，或希望参与贡献：

- 电子邮件：gareth.manning@gmail.com
- X：https://x.com/worldteacherman
- LinkedIn：https://www.linkedin.com/in/gareth-manning-a404b387/
- 在 GitHub 上提交 Pull Request 或 Issue

---

**我是教育工作者——[从这里开始](#立即试用)**

无需任何设置。使用插件、安装本地技能，或手动复制粘贴，即可开始教学。

**我是开发者或 AI 构建者——[从这里开始](#架构)**

了解 YAML 模式、类型化输入与输出、技能链元数据，以及[在线 MCP 服务器](#mcp-server)。

---

## 适用人群

- **一线教师**：希望基于研究证据设计课程与评估，又不想花费数小时查阅资料
- **大学讲师和教授**：较少或从未接受过教师培训，希望获得实用且有研究依据的教学支持
- **课程设计者和教学负责人**：负责构建课程方案、教学单元和评估体系
- **创新与非传统教育环境中的学校管理者**：包括国际学校、蒙台梭利学校、项目式学习学校、民主学校和自然教育学校
- **重新构想教育的创新者**：正在创建新型学校模式、非传统教育项目和下一代学习环境。以研究证据为基础的约束不会限制教育创新，反而会让创新更加深入
- **教育科技开发者和 AI 构建者**：需要结构化、可通过程序访问的教育知识层
- **教育研究者**：关注研究证据如何转化为 AI 介导的教育实践

---

## 项目缘起

AI 正在迅速进入教育领域。它究竟会改善学习成效，还是只会将平庸的教学实践大规模复制，几乎完全取决于它建立在什么基础之上。

多数 AI 教育工具建立在惯例、习惯和假设之上——依据的是教育工作者一贯采用的做法，而不是研究所证实的有效方法。例如学习风格、僵化的课堂结构，以及与学习理论脱节的身心健康项目。随着 AI 在教育中的应用不断扩展，无效实践被规模化复制的风险也随之增加。

本技能库希望构建一种不同的基础：一个可信、严谨的 AI 教育根基。它以明确列名的研究为依据，诚实说明自身局限，并特别面向身处教育前沿、正在建设下一代学校而非仅仅优化现有模式的教育工作者。

这种潜力是真实的：以前所未有的规模提供个性化、以证据为基础的学习支持。但前提是，驱动这一切的必须是真实可靠的研究证据。

它的价值也不仅限于个性化学习，还包括提高教学质量、减轻工作负担。原本需要耗费数小时研究、设计并反复斟酌的教育工作者，可以在几分钟内获得结构化且有研究依据的支持，从而把更多时间留给只有人类才能完成的教学工作。

这只是其中一种使用情境。同一套技能库也可以支持全校课程审查、教师个性化专业发展路径，或编排学期末评估复盘。技能是整个系统的基础；下文的架构将说明这些能力由哪些层次构成。

---

## 立即试用

### 通过运行时安装使用（推荐）

在 Claude、Codex 或 Hermes 中安装技能，然后直接用自然语言告诉 Agent 你的需求。系统可以自动选择相关技能，也可以在本地搜索技能。

**示例：** 输入：*“我正在为九年级规划一个关于细胞的科学单元——共 6 周，每周 3 节课。”*

Claude 会并行运行**逆向设计单元规划器（Backwards Design Unit Planner）**、**间隔练习调度器（Spaced Practice Scheduler）**和**提取练习生成器（Retrieval Practice Generator）**。不到 90 秒，你就能获得一套完整的逐课时教学计划，其中包含间隔提取练习、以研究证据为基础的教学顺序，以及可直接使用的形成性评估活动；所有内容都会按照你提供的时间安排和主题列表进行调整。

### 不安装插件（手动使用）

无需 API key，无需技术设置，也无需安装依赖项。

1. 打开仓库中的任意技能文件（位于 `skills/` 下）
2. 复制其中的提示词区块
3. 粘贴到任意 AI 中，并根据你的课程或使用情境填写相应字段

**示例：** 打开 `skills/memory-learning-science/spaced-practice-scheduler/SKILL.md`，并提供：

- 主题：细胞结构、细胞运输、细胞分裂、酶、生物分子
- 时间安排：8 周学期，从 2 月 3 日开始
- 每周课时：3 节

Claude 将返回完整的逐周计划，说明何时教授新内容，以及何时以逐步扩大的时间间隔复习旧主题；每次复习还会附带具体的提取练习活动。该计划遵循 Cepeda 等人（2006）关于最佳间隔的元分析，包含跨主题交错学习，并提供在复习暴露出知识缺口时应如何处理的实用建议。

---

## 与众不同之处

**以证据作为筛选标准——也包括明确知道应该排除什么。**

每项技能都以明确列名的研究为依据：具体的作者、具体的研究和具体的发现。缺乏实证支持的框架——包括学习风格、VAK 以及其他广为流传但证据薄弱的方法——不会被纳入。技能库在 [EXCLUSIONS.md](docs/EXCLUSIONS.md) 中准确说明了哪些内容被排除及其原因。对于任何希望区分研究证据与惯例的学校或院系来说，这份文档本身就值得阅读。

**透明标注证据强度。**

| 评级 | 含义 |
|------|------|
| **强（Strong）** | 多项元分析或系统综述得出一致结论 |
| **中等（Moderate）** | 有扎实的实验研究支持，但会随情境有所变化 |
| **新兴（Emerging）** | 研究基础展现出潜力，但重复验证或实践转化仍然有限 |
| **原创（Original）** | 实践者提出的框架；明确标注，且不宣称有研究证据支持 |

第 15 个领域收录的原创框架均作出了诚实标注。需要注意的一项重要局限是：这些技能编码了以研究证据为基础的提示词，但这些提示词本身尚未作为 AI 干预措施接受实证验证。相关工作仍在进行中。

**由拥有 20 年国际学校经验的教育工作者创建。**

每一条提示词、每一种输出结构以及每个“已知局限”部分所包含的教学判断，都来自真实的课堂与课程设计实践，而不仅仅是对研究文献的阅读。

**从一开始就为编排而设计。**

每项技能都内置 YAML 模式头、类型化输入与输出字段、技能链元数据和可组合输出。这并不是一个后来才附加元数据的提示词合集，而是一套专为程序化使用而设计的技能库。

---

## 20 个领域

> **关于第 20 个领域：** 第 1–19 个领域面向教师和设计者，用于生成计划、量规、脚手架和评估。第 20 个领域则有所不同：这些技能会在学生的学习过程中实时运行，影响 AI 如何回应学习者。20 个领域遵循同一个原则——以研究证据为基础——但其使用者、输出和调用模式都不相同。详情请参阅[第 20 个领域的技能](skills/student-learning/)。

| # | 领域 | 技能数 | 重点内容 |
|---|------|--------|----------|
| 1 | **记忆与学习科学** | 8 | 提取练习、间隔学习、交错学习、认知负荷、双重编码、精细加工提问（elaborative interrogation）、反馈 |
| 2 | **自我调节学习与元认知** | 5 | 自我调节脚手架、元认知提示、目标设定、学习策略选择、错误分析 |
| 3 | **显性教学与直接教学** | 5 | 责任逐步释放序列、理解检查、课堂导入、出声思考示范、练习设计 |
| 4 | **提问、讨论与对话** | 5 | 苏格拉底式提问、讨论流程、对话式教学策略、枢纽问题（hinge questions） |
| 5 | **读写素养、写作与批判性思维** | 7 | 论证结构、学科写作、阅读理解、来源评估、文本复杂度、媒体素养、批判性思维 |
| 6 | **英语作为附加语言或方言（EAL/D）与语言发展** | 5 | 语言需求分析、词汇分层、脚手架式任务调整、句式框架、庇护式教学（sheltered instruction） |
| 7 | **课程设计与评估** | 13 | 逆向设计、能力拆解、量规生成、评估效度、形成性评估、差异化教学、差距分析、学习进阶、项目式学习、阈限概念转译 |
| 8 | **身心健康、动机与学生能动性** | 12 | 动机诊断、自我效能、身心健康与学习的联系、能动性脚手架、归属感及相关实践 |
| 9 | **专业学习与教师发展** | 10 | 课堂观察、反思性实践、专业发展活动设计、数据解读及相关实践 |
| 10 | **全球与跨文化教学法** | 9 | 变易理论、具体—图示—抽象（CPA）序列、现象式学习、文化回应式教学、Ubuntu、地方本位探究、瑞吉欧记录、生成式项目、跨文化效度 |
| 11 | **环境与体验式学习** | 6 | 户外学习、亲生命设计、生态探究、体验式学习循环、跨学科联系、服务学习 |
| 12 | **AI 学习科学** | 14 | 自适应提示、错误示例、数字化范例、间隔算法、AI 反馈、辅导对话、学习分析、协作学习、认知辅导、自我解释、元认知监控、生产性失败、范例过渡、形成性评估循环 |
| 13 | **AI 素养** | 7 | AI 输出审查、幻觉事实核查、提示词素养、专业知识检验、学习边界映射、AI 苏格拉底式对话、学科 AI 可靠性 |
| 14 | **蒙台梭利与其他循证方法** | 4 | 三阶段教学、预备环境设计、混龄学习、不受打扰的工作周期 |
| 15 | **原创框架** | 17 | SEEDS 再生式探究、H3Uni 系统方法（界定范围、三地平线、两难导航、多视角决策轮）、发展阶段系统、学习目标编写、量规逻辑、自主决定项目设计、倾向性评估、单点量规；复合编排器（评估设计、包容性设计、地方本位课程、再生式项目设计、关怀式系统觉察） |
| 16 | **课程对齐** | 4 | 覆盖度审查、KUD（Know–Understand–Do）图表编写、发展阶段转译、范围与顺序 |
| 17 | **历史思维** | 10 | 来源辨析、细读、情境化、互证、基于史料的课程设计、史料集策划、史料改编、策略示范、评估设计、核心问题评价 |
| 18 | **系统思维** | 8 | 系统觉察冰山、愿景冰山、六边形复杂性图谱、杠杆与响应设计、心智模型图谱、系统行动能动圈、推论阶梯、系统性身心健康影响 |
| 19 | **包容性设计** | 3 | 通用学习设计（UDL）课程审查、参与/表征/行动方式的选项设计、教学实施前的障碍预判 |
| 20 | **面向学生的学习技能** *（新增）* | 13 | 先提取后作答、先解释再追问、渐进式提示阶梯、信心校准检查、卡点与错误诊断、AI 主张核查、迁移桥接、复述讲解评估、有效失败（productive failure）协议、自我调节学习会话框架、无辅助证据检查点、每周能动性复盘、脚手架渐隐管理 |

---

## 架构

本技能库是一个三层系统中的第 1 层。完整设计还包括情境引擎（第 2 层）和编排器（第 3 层），详见 [ARCHITECTURE.md](docs/ARCHITECTURE.md)。

### 面向开发者：YAML 模式

每项技能都以机器可读的 YAML 头部开始，其中包含技能 ID、所属领域、证据强度、证据来源、类型化输入/输出模式、技能链元数据和标签。完整格式可参阅 `skills/` 下的任意技能文件，也可以在 [ARCHITECTURE.md](docs/ARCHITECTURE.md) 中查看模式参考。

### MCP Server

对于确实需要远程发现或程序化访问的客户端，本技能库提供在线 MCP 服务器。

**生产环境 URL：** `https://mcp-server-sigma-sooty.vercel.app/mcp`

请注意：托管 MCP 服务器只是一个便捷入口，并不是使用本技能库的唯一方式。如果可以在本地安装技能，请优先选择[开始使用](#开始使用)中介绍的免费本地方案。

托管 MCP 访问现在需要唯一的身份验证令牌。请在此申请：[托管 MCP 访问申请](https://docs.google.com/forms/d/e/1FAIpQLSdW1EdcmtjSPPq68Hx-bdth5hO2KNyjhAwEV9Ld0EwWL1Gr8Q/viewform)。Gareth 的 Agent 通常会在几分钟内通过电子邮件发送 MCP URL、令牌和简要设置说明。详情请参阅[托管 MCP 访问说明](docs/HOSTED_MCP_ACCESS.md)。

在 Claude.ai 中，可前往 **Integrations > MCP Servers** 添加该 URL。在 Claude Desktop 中，使用以下配置：

```json
{
  "mcpServers": {
    "education-skills": {
      "type": "streamable-http",
      "url": "https://mcp-server-sigma-sooty.vercel.app/mcp",
      "headers": {
        "Authorization": "Bearer <在此粘贴访问令牌>"
      }
    }
  }
}
```

服务器提供：

- **169 个工具**（165 项技能 + 4 个发现工具：`list_skills`、`find_skills`、`suggest_skills`、`get_skill_details`）
- **165 个提示词**（供能够呈现 MCP prompts 的客户端使用）

源代码、本地设置与开发说明：[`mcp-server/`](mcp-server/)

---

## 参与贡献

纳入标准详见 [CONTRIBUTING.md](CONTRIBUTING.md)。本项目有意维持较高标准——每项技能都必须以明确列名的研究证据为基础，诚实标注证据等级，并具备实际用途。本技能库的价值取决于它的严谨性。

### 新增或修订技能的工作流程

创建或编辑 `SKILL.md` 后，请在提交前运行以下步骤：

```bash
# 1. 重新生成 registry
python3 scripts/generate-registry.py

# 2. 重新构建 MCP 服务器 bundle——每次新增或修订技能后都必须执行
cd mcp-server && npm run bundle-skills && cd ..

# 3. 将两个生成文件与技能文件一同暂存
git add skills/<domain>/<skill-name>/SKILL.md registry.json mcp-server/src/skills.json
```

**为什么 bundle 步骤很重要：** 运行在 Vercel 上的 MCP 服务器不会在部署时读取 `SKILL.md` 文件，而是提供预先构建的 `mcp-server/src/skills.json` 快照。如果新增或修订技能后没有重新构建 bundle 并提交结果，那么即使重新部署 Vercel，更改也不会出现在在线服务器中。CI 会检测到这种情况并使构建失败。

---

## 鸣谢

由 [Gareth Manning](https://substack.com/@garethmanning) 创建——教育工作者、课程设计者和学习系统设计者，拥有遍及 27 个国家、长达 20 年的国际教育经验。

## 许可证

[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)：开放、可分叉、以相同方式共享。
