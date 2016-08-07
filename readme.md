# NodeJS PokemonGO Bot/Client

Here you have a simple bot/client for PokemonGO. You can use it using the web interface on [http://localhost:3000/](http://localhost:3000/) when you start the NodeJS script with:

```
node app.js
```

Before, you must to install all neccesary packages with:

```
npm install
```

This bot/client uses my own [fork](https://github.com/segura2010/Pokemon-GO-node-api) of [Pokemon-Go-node-api](https://github.com/Armax/Pokemon-GO-node-api). You can use the original API, but it could not work.

**Due to latest API changes, we recommend you configure the example_config.json file with your real device information and rename it to config.json**

This bot/client allows you to Log In with your PokemonGo account, and choose with clicks on the map where you want to go. The bot will create a route to go to the goal using Google Maps service, usign intermediate waypoints (to avoid teleportation and ban).

Also, you can get near pokestops and show them on the map.

You can activate or deactivate two checkbox:

- "Catch Pokemons?": if checked, the bot will catch all pokemons it finds in its way
- "Farming?": if checked, the bot will automatically move over the map to use near pokestops, all the time until you uncheck it. (I do not recommend to use this option because you can be banned).

And finally, you can give a list of pokemons (pokemons names separated by commas, ex:bulbasaur,pikachu) to catch only these pokemons ("Catch Pokemons?" must be uncheked).

**NOTE**: The bot will use all the Pokestops it find in its way.

Feel free to modify as you want this bot, open issues if you find some bug or to propose new functionality. I made it on my spare time, so I dont promise you to keep it updated :(


### Examples

![](http://i.giphy.com/l46CAn1NRxUILqOFG.gif)

![](http://i.giphy.com/l46Cl3OAOOrZwiVPO.gif)

![](http://i.imgur.com/A1s0D50.png)


### License

GNU GENERAL PUBLIC LICENSE Version 2.