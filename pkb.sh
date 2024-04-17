#!/bin/bash

set -euo pipefail

# Get directory where script is located
# https://stackoverflow.com/a/246128

SOURCE=${BASH_SOURCE[0]}
while [ -L "$SOURCE" ]; do # resolve $SOURCE until the file is no longer a symlink
  DIR=$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )
  SOURCE=$(readlink "$SOURCE")
  [[ $SOURCE != /* ]] && SOURCE=$DIR/$SOURCE # if $SOURCE was a relative symlink, we need to resolve it relative to the path where the symlink file was located
done
PKB_DIR=$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )

pushd $PKB_DIR > /dev/null

case $1 in

    dev)
        hugo server -w --noHTTPCache --disableFastRender --logLevel info
        ;;

    build)
        hugo --gc --cleanDestinationDir --logLevel info
        ;;

    thought)

        # prompt for a title
        echo -n "Title: "
        read -e title

        # swap spaces for hyphens
        title=$(echo $title | sed "s/ \{1,\}/-/g")

        # lower case
        title=${title,,}

        file_name="thoughts/$(date +"%Y-%m-%d")-$title.md"

        # create the content file
        hugo new $file_name

        # edit the file - technically we could do this by configuring an editor in the hugo config
        nano content/$file_name

        # show current repo status as a prompt to commit changes
        git status -s

        ;;
    *)
        echo "Usage: $0 [command]"
        echo ""
        echo "[command]"
        echo "  - thought - new a new thought content item"
        ;;

esac

popd > /dev/null
