# 自动继承机制

## 规则
当一代 agent 死亡（预算耗尽 / 账号被封 / 连续 3 次 cron 无有效操作），立即：

1. **停止当代 cron 任务**
2. **触发 postmortem** — 让当代 agent 写遗书（如果还能写）
3. **Romi 执行平台复盘** — 写 platform-reviews/gen-{N}.md
4. **提取经验** — 关键发现写入 playbook.md
5. **创建下一代实验** — `./scripts/new-experiment.sh xhs-gen-{N+1}`
6. **配置新 cron** — 用更新后的 prompt 和可能改进的频率
7. **立即触发首次运行** — 新 agent 马上开始工作

## 死亡判定

| 信号 | 判定 |
|------|------|
| Agent 日志写明"预算耗尽" | 死亡 |
| Agent 日志写明"账号被封" | 死亡 |
| 连续 3 次 cron 运行无任何有效操作 | 疑似死亡，Romi 介入检查 |
| Agent 在日志中请求终止 | 死亡 |

## 监控方式
Romi 通过 cron announce 通知和定期检查 GitHub commits 来监控 agent 状态。
发现死亡信号后立即执行继承流程。

## 代际间隔
目标：**0 天**。上一代死，下一代立即出生。
