mkdir my-code-tutorial
cd my-code-tutorial
npm init -y
npm install -D astro interactive-code-scroll@alpha

npm pkg set scripts.dev="interactive-code-scroll dev"
npm pkg set scripts.build="interactive-code-scroll build"
npm pkg set scripts.serve="interactive-code-scroll serve"

mkdir -p tutorial/code tutorial/images
touch tutorial/tutorial.mdx
touch tutorial/code/index.html
touch tutorial/code/style.css
