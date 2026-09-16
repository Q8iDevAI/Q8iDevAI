typeset -g Q8IDEVAI_SHELL_INTEGRATION_DIR="${${(%):-%N}:A:h}"

if [[ -n "${Q8IDEVAI_ZSH_ZDOTDIR-}" ]]; then
  export ZDOTDIR="${Q8IDEVAI_ZSH_ZDOTDIR}"
else
  unset ZDOTDIR
fi

if [[ -n "${ZDOTDIR-}" ]]; then
  if [[ -f "${ZDOTDIR}/.zshenv" ]]; then
    source "${ZDOTDIR}/.zshenv"
  fi
elif [[ -f "${HOME}/.zshenv" ]]; then
  source "${HOME}/.zshenv"
fi

source "${Q8IDEVAI_SHELL_INTEGRATION_DIR}/q8idevai-integration.zsh"
