#!/bin/bash

# -= boilerplate =-

# exit on errors
set -euo pipefail

# for any relative paths
export SCRIPT_DIR=$(dirname "$(realpath $0)")
echo "SCRIPT_DIR=$SCRIPT_DIR"


# -= ensure `shepherd.config.json` exists =-

CONFIG_FILE="$SCRIPT_DIR/addons/nsfw/shepherd.config.json"
if [ ! -f "$CONFIG_FILE" ]; then
  echo "$CONFIG_FILE not found. creating default..." 2>&1 | tee -a setup.log
  cat <<EOF > "$CONFIG_FILE"
{
"plugins": [ 
  "shepherd-plugin-nsfw@latest"
],
"lowmem": false
}
EOF
fi

# -= import .env vars =-

if [ -f ".env.local" ]; then
  export $(egrep -v '^#' .env.local | xargs)
  # check vars
  extra_queues_checker=${EXTRA_QUEUES:-}
  if [[ -z $extra_queues_checker ]]; then
    echo "INFO: EXTRA_QUEUES undefined"
  else
    echo "EXTRA_QUEUES=$EXTRA_QUEUES"
  fi
    
  plugin_checker=${PLUGIN:-}
  if [[ -z $plugin_checker ]]; then
    echo "INFO: PLUGIN undefined"
    export PLUGIN=nsfw
  else
    echo "PLUGIN=$PLUGIN"
  fi
    
  echo "BLACKLIST_ALLOWED=$BLACKLIST_ALLOWED"
  echo "GW_URLS=$GW_URLS"


  # make sure .env ends in newline
  lastchar=$(tail -c 1 .env.local)
  if [ "$lastchar" != "" ]; then 
    echo >> .env
  fi
else
  echo "continuing without .env.local file."
fi


# import `.RANGELIST_ALLOWED.json` as a string

if [ ! -f ".RANGELIST_ALLOWED.json" ]; then
  echo "WARNING: .RANGELIST_ALLOWED.json not found"
else
  export RANGELIST_ALLOWED=$(cat ./.RANGELIST_ALLOWED.json | tr -d ' \n\t')
  echo "RANGELIST_ALLOWED=$RANGELIST_ALLOWED"
fi

##########################################
# -= generate compose file to be used =- #
##########################################

# copy override file to generated file
generated_file="compose.generated.yml"
cat "$SCRIPT_DIR/docker-compose.override.yml" > $generated_file

# function to generate the sevice entry for a plugin
function generate_service_entry {
  local plugin_name=$1
  cat << EOF >> $generated_file

  # automatically generated service entry
  $plugin_name:
    extends:
      file: ./addons/$plugin_name/docker-compose.local.yml
      service: $plugin_name
EOF
}

# import PLUGINS and 
plugins_checker=${PLUGINS:-}
if [[ -z $plugins_checker ]]; then
  echo "INFO: PLUGINS=undefined." #TODO: add default behaviour here
else
  echo "PLUGINS=$PLUGINS"
  IFS=',' read -r -a plugin_dirs <<< "$PLUGINS" # plugins_dirs = PLUGINS.split(',')
  for plugin_name in "${plugin_dirs[@]}"; do
    echo "generating service entry for $plugin_name"
    generate_service_entry $plugin_name
  done
fi



##########################################
# -= finally run the compose commands =- #
##########################################

command_string="docker compose -f $SCRIPT_DIR/docker-compose.yml -f $SCRIPT_DIR/$generated_file "

# docker compose -f $SCRIPT_DIR/docker-compose.yml -f $SCRIPT_DIR/docker-compose.override.yml up --build -d 
eval "$command_string up --build "

# docker compose -f $SCRIPT_DIR/docker-compose.yml -f $SCRIPT_DIR/docker-compose.override.yml logs -f
eval "$command_string logs -f"