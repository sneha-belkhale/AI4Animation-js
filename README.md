# AI4Animation - for javascript & three.js

## Description

This project is a port of the original <a href ="https://github.com/sebastianstarke/AI4Animation">AI4Animation</a> project, for use with three.js on the web. It explores the possibilities of using artifical intelligence to generate realtime character animations. This is very powerful as it allows for an unlimited number of realistic transitions between animation states.

I followed the <a href ="https://github.com/sebastianstarke/AI4Animation/tree/master/AI4Animation/Assets/Demo/SIGGRAPH_2018
">SIGGRAPH 2018</a>.  example for this demo, using the same model weights and corresponding skeleton. After providing the inputs of trajectory points and previous bone positions, the neural network ( written using <a href ="https://github.com/nicolaspanel/numjs#readme">numjs</a> ) outputs the next set of bone positions and velocities. 

If you want to use a different skeleton, you will need to get motion capture data for this skeleton and train a new model, the instructions and tensorflow code for this are in the AI4Animation project <a href ="https://github.com/sebastianstarke/AI4Animation/tree/master/TensorFlow/SIGGRAPH_2018">here</a>. 

<img src ="https://user-images.githubusercontent.com/17795014/56417371-44dea780-62c6-11e9-8bcb-c01f109f7bdb.png" width="75%">

## Todo Items:

- An example with a human skeleton. 
- Trying a simpler machine learning model to help with the fps. 

## Live Demo

https://codercat.tk/ai-animation/

## Run the demo yourself: 

Run the following commands:
```
yarn install
yarn pull // this pulls the model weights hosted on the web
yarn start
```
Then open http://127.0.0.1:3000 in a web browser.
