**canyue233OVO** opened on Dec 12, 2025 · edited by canyue233OVO

### What version of the VS Code extension are you using?

0.4.51

### What subscription do you have?

Team

### Which IDE are you using?

Vs code

### What platform is your computer?

Microsoft Windows NT 10.0.19045.0 x64

### What issue are you seeing?

VSCode Extension in Windows always Failed:Missing environment variable: `APIROUTER_API_KEY`. but i can use it in WSL,powershell,cmd,and i can normal use in VS code Extension 0.4.46-

### What steps can reproduce the bug?

Just always Missing environment variable: `APIROUTER_API_KEY`.

### What is the expected behavior?

*No response*

### Additional information

*No response*

---

**canyue233OVO** added **extension** on Dec 12, 2025

---

**github-actions** added **bug** **windows-os** on Dec 12, 2025

---

**etraut-openai** *Collaborator* commented on Dec 12, 2025

Am I correct in assuming that you've configured codex to look for environment variable `APIROUTER_API_KEY` in your configuration file (config.toml)? This error indicates that you've told codex to use that environment variable's value as the API key for your model. If it's not available in the environment you're running codex in, then you'll see this error.

---

**canyue233OVO** *Author* commented on Dec 12, 2025 · edited by canyue233OVO

> Am I correct in assuming that you've configured codex to look for environment variable `APIROUTER_API_KEY` in your configuration file (config.toml)? This error indicates that you've told codex to use that environment variable's value as the API key for your model. If it's not available in the environment you're running codex in, then you'll see this error.我理解正确吗？你已经配置 Codex 在配置文件（config.toml）中查找环境变量 `APIROUTER_API_KEY`？这个错误表明你让 Codex 使用该环境变量的值作为你模型的 API 密钥。如果你运行 Codex 的环境中没有这个错误，你就会看到这个错误。

我不清楚，环境配置都是配置好的，且我可以在WSL，cmd，powershell等环境运行正常，但是单在VS code里面就不行。对话就会显示Failed: Missing environment variable: APIROUTER_API_KEY.  
I'm not sure. The environment configuration is already set up, and I can run it normally in environments like WSL, cmd, and PowerShell, but it just doesn't work in VS Code Extension without WSL connect in 0.4.46+,but can normal use in 0.4.46-. always shows: Failed: Missing environment variable: APIROUTER_API_KEY.

---

**etraut-openai** *Collaborator* commented on Dec 12, 2025

That indicates the environment variable isn't being preserved / inherited when you start VS Code.

---

**canyue233OVO** *Author* commented on Dec 12, 2025 · edited by canyue233OVO

> That indicates the environment variable isn't being preserved / inherited when you start VS Code.这意味着当你启动 VS Code 时，环境变量没有被保留或继承。

![Image](https://private-user-images.githubusercontent.com/226403731/526008510-5e3ac472-46e9-47aa-89a6-90663b6d07e5.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NjU2ODk4NTEsIm5iZiI6MTc2NTY4OTU1MSwicGF0aCI6Ii8yMjY0MDM3MzEvNTI2MDA4NTEwLTVlM2FjNDcyLTQ2ZTktNDdhYS04OWE2LTkwNjYzYjZkMDdlNS5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjUxMjE0JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI1MTIxNFQwNTE5MTFaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT04MTYzMzcwOTg4ZjAwNTY1MGU2N2Y1OWVlYTNhYjY1MzU0NjYyZjNiM2Q2OTQ2NDRmYzk1YTAwMGI5ODAyZmIyJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCJ9.2ImxicKVOworbr7Pd2yLXERKV6_WWg48zLHSInbd0WY)

可是我在0.4.46-版本中是可以正常使用的，我检查了，环境变量是有被保留或继承的，应该还是CodeX的问题。  
But in version 0.4.46 and earlier, it can be worked fine. I checked, and the environment variables are preserved or inherited properly. The issue is likely still with CodeX.

---

**canyue233OVO** changed the title ~~VSCode Extension in Windows always Failed:Missing environment variable: `APIROUTER_API_KEY`. but i can use it in WSL,powershell,cmd,and i can normal use in VS code Extension 0.5.46-~~ VSCode Extension in Windows always Failed:Missing environment variable: `APIROUTER_API_KEY`. but i can use it in WSL,powershell,cmd,and i can normal use in VS code Extension 0.4.46- on Dec 12, 2025

---

**etraut-openai** *Collaborator* commented on Dec 12, 2025

Yeah, the fact that you're seeing a difference in behavior across versions does seem to indicate a potential regression here. You mentioned that it worked on 0.4.46 but didn't on 0.4.51. Since you have a repro, are you able to narrow it down any further? For example, do you see the problem with 0.4.47?

---

**canyue233OVO** *Author* commented on Dec 12, 2025

> Yeah, the fact that you're seeing a difference in behavior across versions does seem to indicate a potential regression here. You mentioned that it worked on 0.4.46 but didn't on 0.4.51. Since you have a repro, are you able to narrow it down any further? For example, do you see the problem with 0.4.47?是的，你看到不同版本之间行为的差异，确实说明可能存在回归。你提到它在0.4.46上能用，但在0.4.51上不行。既然你有重制版，能进一步缩小范围吗？比如，你觉得0.4.47有什么问题吗？

我试了一下0.4.47，结果就出现了Failed:Missing environment variable: APIROUTER_API_KEY.  
oh，it starts at 0.4.47,i test it,then Failed:Missing environment variable: APIROUTER_API_KEY. appeared.

---

**canyue233OVO** *Author* commented on Dec 13, 2025 · edited by canyue233OVO

> Yeah, the fact that you're seeing a difference in behavior across versions does seem to indicate a potential regression here. You mentioned that it worked on 0.4.46 but didn't on 0.4.51. Since you have a repro, are you able to narrow it down any further? For example, do you see the problem with 0.4.47?

could you please to fix it? thanks a lot.