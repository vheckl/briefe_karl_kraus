#!/bin/bash

echo "fetching transkriptions from data_repo"
rm -rf data/
curl -LO https://github.com/vheckl/dse-static-data/archive/refs/heads/main.zip
unzip main

mv ./dse-static-data-main/data/ .

rm main.zip
rm -rf ./dse-static-data-main

echo "fetch imprint"
./shellscripts/dl_imprint.sh
