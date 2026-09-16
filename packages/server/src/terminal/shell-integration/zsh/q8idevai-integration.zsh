if [[ -n "${_Q8IDEVAI_ZSH_INTEGRATION_LOADED-}" ]]; then
  return
fi
typeset -g _Q8IDEVAI_ZSH_INTEGRATION_LOADED=1

autoload -Uz add-zsh-hook

typeset -g _Q8IDEVAI_ZSH_COMMAND_ACTIVE=0

function _q8idevai_osc633() {
  printf '\e]633;%s\a' "$1"
}

function _q8idevai_precmd() {
  local command_status=$?
  if [[ "$_Q8IDEVAI_ZSH_COMMAND_ACTIVE" == "1" ]]; then
    _q8idevai_osc633 "D;${command_status}"
    _Q8IDEVAI_ZSH_COMMAND_ACTIVE=0
  fi
  printf '\e]2;%s\a' "${PWD/#$HOME/~}"
  _q8idevai_osc633 "A"
}

function _q8idevai_preexec() {
  _Q8IDEVAI_ZSH_COMMAND_ACTIVE=1
  _q8idevai_osc633 "B"
  _q8idevai_osc633 "C"
  printf '\e]2;%s\a' "$1"
}

add-zsh-hook precmd _q8idevai_precmd
add-zsh-hook preexec _q8idevai_preexec
