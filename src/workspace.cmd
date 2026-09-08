# Opens Windows Terminal with 3 panes in the first tab, and a new second tab
wt -d "./client"; new-tab -d "./server"; new-tab -d "../"; split-pane -V -d "./client" ; split-pane -H -d "./server" 