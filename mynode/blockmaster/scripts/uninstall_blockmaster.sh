#!/bin/bash
source /usr/share/mynode/mynode_device_info.sh
source /usr/share/mynode/mynode_app_versions.sh
source /usr/share/mynode/mynode_functions.sh

echo "==================== UNINSTALLING APP ===================="
# Containers, network and the Block Master image. Data on /mnt/hdd/mynode/blockmaster is kept
# (uninstall-mynode.sh --purge removes it). The shared mempool/backend + mariadb images are left alone:
# myNode's built-in Mempool app may use them too.
bash /opt/mynode/blockmaster/app_data/run.sh stop || true
remove_docker_images_by_name 'blockmaster/frontend' || true
echo "================== DONE UNINSTALLING APP ================="
