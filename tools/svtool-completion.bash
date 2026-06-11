# Bash completion for the svtool CLI.
#
# Install (pick one):
#   - one shell session:   source tools/svtool-completion.bash
#   - permanently (user):  echo "source $PWD/tools/svtool-completion.bash" >> ~/.bashrc
#   - system-wide:         sudo cp tools/svtool-completion.bash /etc/bash_completion.d/svtool

_svtool_complete() {
  local commands="help version info build verify clean"
  COMPREPLY=()
  # First argument: the command itself.
  if [ "$COMP_CWORD" -eq 1 ]; then
    COMPREPLY=( $(compgen -W "$commands" -- "${COMP_WORDS[1]}") )
    return
  fi
  # Second argument: per-command targets.
  if [ "$COMP_CWORD" -eq 2 ] && [ "${COMP_WORDS[1]}" = "build" ]; then
    COMPREPLY=( $(compgen -W "bundle import-from" -- "${COMP_WORDS[2]}") )
  fi
}

complete -F _svtool_complete svtool
