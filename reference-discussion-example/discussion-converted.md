**guidedways** - Nov 25, 2025

System prompts are important, because these are the very first instructions the model receives. Writing one for a general purpose CLI agent is tough - it needs to be generic and useful enough to work for a wide variety of development setups.

I've found however that using a custom system prompt for your particular setup squeezes even more out of SOTA models such as Codex (which is already an incredibly powerful model - with minimal instructions it does wonders).

To help you setup a custom system prompt, I've compiled a short tutorial:

## Quick Setup

In my case, I've setup various aliases in `.zshrc` such as `codex-swift` for obj-c / swift projects, `codex-bug` for meticulous bug hunting and so on. I leave more of the project specific stuff for `AGENTS.md` within the repo I work in, while I keep my system prompt generic but suitable for my personal needs and specific to a particular tech stack (with a well defined role etc). I won't be sharing the prompts as I'll encourage you to create your own.

Add to your `~/.zshrc` (or `~/.bashrc`):

```
# Helper function: runs codex with custom instructions from a file
codex-with-instructions() {
  local instructions_file="$1"
  shift

  if [ ! -f "$instructions_file" ]; then
    echo "Error: instructions file not found: $instructions_file" >&2
    return 1
  fi

  local instructions
  instructions="$(<"$instructions_file")"

  codex --config developer_instructions="$instructions" "$@"
}

# Example profiles
codex-swift() {
  codex-with-instructions "$HOME/.codex/systemprompts/swift.md" "$@"
}

codex-bug() {
  codex-with-instructions "$HOME/.codex/systemprompts/bug.md" "$@"
}
```

    
      
    

      
    

    
  

## Create Your Instructions

```
mkdir -p ~/.codex/systemprompts

cat > ~/.codex/systemprompts/swift.md << 'EOF'
You are a senior Swift engineer....
EOF

cat > ~/.codex/systemprompts/bug.md << 'EOF'
You are a meticulous bug hunter...
EOF
```

    
      
    

      
    

    
  

## Usage

```
# Reload shell
source ~/.zshrc

# Run with Swift profile
codex-swift

# Run with bug-hunting profile
codex-bug
```

---

**steve-a-jones** (Author) - Nov 25, 2025

[@guidedways](https://github.com/guidedways) Thanks for the example. I have actually defined custom prompts within `~/.codex/prompts` before and these are exposed as slash commands within interactive codex sessions -- and when the command is applied codex will inject the predefined prompt as a message within the session.

In your example I see that you are utilizing  custom prompts in `~/.codex/prompts` and then reading the contents and passing via `developer_instructions`. I'm not aware that custom prompts and `developer_instructions` are correlated -- have you seen this documented anywhere?

So i've been passing instructions via  `developer_instructions` both in interactive sessions and via `codex exec` and not convinced that codex is actually picking them up --

- I've been studying the logs from codex session by setting RUST_LOG to TRACE -- I am able to grep for most other configurations being applied, but see no trace of the contents from my `developer_instructions`.
- In my `developer_instructions` I've added explicit instructions for the model to output a very specific json blob after reading the instructions -- I started adding these "breadcrumbs" a while back as I was occasionally observing that codex was ignoring my AGENTS.md. In my tests I do see my breadcrumb from AGENTS echoed back, but nothing from `developer_instructions`.

Appreciate your thoughts on this!

  **steve-a-jones** - Nov 25, 2025

  I was able to get this working -- typo on my part. Thanks again [@guidedways](https://github.com/guidedways)

  **guidedways** - Nov 25, 2025

  Great! I've also updated the instructions to say `systemprompts` instead

---

**guidedways** (Author) - Nov 25, 2025

Instead of `prompts` move them to `system_prompts` (that's where I have them, I didn't realize `prompts` was a thing and used it as an example)

Update: the example above has been updated.

---

**steve-a-jones** (Author) - Nov 26, 2025

Thanks [@guidedways](https://github.com/guidedways), i've dug a bit deeper and would like to share some findings. It's likely this is documented somewhere, but for newcomers stumbling into this discussion I hope this sheds light on how the various prompts are expressed to the model api under the hood.

Once codex has completed it's startup routine it will kick things off with a POST to the responses api at `https://chatgpt.com/backend-api/codex/responses` The payload here contains a few levels of instructions --

First there are the default "instructions" (not sure if "system prompt" is the right terminology here as there may be another level above this).

Default instructions are located at `codex-rs/core` (e.g.; [https://github.com/openai/codex/blob/963009737fc6e7d45ca5cb37d63107b8be368eda/codex-rs/core/gpt-5.1-codex-max_prompt.md](https://github.com/openai/codex/blob/963009737fc6e7d45ca5cb37d63107b8be368eda/codex-rs/core/gpt-5.1-codex-max_prompt.md)). These instructions can be overwritten via `—config experimental_instructions_file=<path to system instructions override file>`, although there appears to be certain criteria that must be met for overriding instructions to be considered valid (an error being thrown if not).

Second, there are "developer instructions" -- these are conversation messages with a role type of "developer" -- these can be supplied via  `--config developer_instructions` (see [@guidedways](https://github.com/guidedways) utils above for usage)

Third, there is your AGENTS.md file -- also expressed as conversation message with a role of "user".

Lastly, there is the user's prompt -- also a convo message with a role of "user."

Here the general shape of the payload sent for those wanting to see how all of this comes together:

```
{
  model : "gpt-5.1-codex-max,.."
  
  instructions: "Corresponding DEFAULT system prompt for model (see codex-rs/core for all system prompts) OR your system prompt override from —config experimental_instructions_file=<path to system instructions override file>"
  
  input : [
    {
      type : "message",
      role : "developer",
      content : [
        {
          type: "input_text",
          text: "<developer instructions from --config developer_instructions>"
        }
      ]
    },
    {
      type: "message",
      role: "user",
      content: [
        {
          type: "input_text",
          text: "<content from your AGENTS.md>"
        }  
      ]
    },
    {
      type: "message",
      role: "user",
      content: [
        {
          type: "input_text",
          text: "<environment_context>  codex config settings here...   </environment_context>"
        }  
      ]
    },
    {
      type: "message",
      role: "user",
      content: [
        {
          type: "input_text",
          text: "ACTUAL USER PROMPT HERE"
        }  
      ]
    },
  ],
  tools: [
     ...  
  ],
  ...
}
```

  **guidedways** - Nov 26, 2025

  Thanks for the deep-dive, this is very insightful and should help visualize how this all ties up in the end.

---

**etraut-openai** - Nov 26, 2025

[@guidedways](https://github.com/guidedways), thanks for posting this. I appreciate you taking the time to share these insights and suggestions with the Codex community!

---

**numman-ali** - Dec 5, 2025

This is amazing! Was looking for the solution! Thank you [@guidedways](https://github.com/guidedways) !

---