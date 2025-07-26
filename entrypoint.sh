#!/bin/bash

lang=$1
file=$2
input_file="/app/input.txt"
output_file="/app/outputs/output.txt"

case "$lang" in
  cpp)
    echo "Compiling $file..."
    g++ /app/$file -o /app/a.out
    if [ $? -eq 0 ]; then
      echo "Running executable..."
      timeout 10s /app/a.out < $input_file > $output_file
    else
      echo "Compilation failed" > $output_file
    fi
    ;;
  java)
    echo "Compiling $file..."
    javac /app/$file
    if [ $? -eq 0 ]; then
      className=$(basename "$file" .java)
      echo "Running Java class $className..."
      timeout 10s java -cp /app $className < $input_file > $output_file
    else
      echo "Compilation failed" > $output_file
    fi
    ;;
  python)
    echo "Running Python file $file..."
    timeout 10s python3 /app/$file < $input_file > $output_file
    ;;
  *)
    echo "Unsupported language: $lang" > $output_file
    exit 1
    ;;
esac
