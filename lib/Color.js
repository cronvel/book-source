/*
	Book Source

	Copyright (c) 2023 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



function Color() {
	this.baseName = '' ;
	this.saturationLevel = 0 ;
	this.lightnessLevel = 0 ;
	this.opacityLevel = 0 ;
	this.tintRate = 0 ;
	this.toneRate = 0 ;
	this.shadeRate = 0 ;
}

module.exports = Color ;



Color.prototype.hasModifier = function() {
	return this.saturationLevel || this.lightnessLevel || this.opacityLevel || this.tintRate || this.toneRate || this.shadeRate ;
} ;



Color.prototype.cname = function() {
	var str = '' ;

	if ( this.opacityLevel <= -3 ) { str += 'dimmest-' ; }
	else if ( this.opacityLevel <= -2 ) { str += 'dimmer-' ; }
	else if ( this.opacityLevel <= -1 ) { str += 'dim-' ; }
	else if ( this.opacityLevel <= -0.5 ) { str += 'slightly-dim-' ; }
	else if ( this.opacityLevel <= -0.25 ) { str += 'subtly-dim-' ; }

	if ( this.saturationLevel <= -3 ) { str += 'dullest-' ; }
	else if ( this.saturationLevel <= -2 ) { str += 'duller-' ; }
	else if ( this.saturationLevel <= -1 ) { str += 'dull-' ; }
	else if ( this.saturationLevel <= -0.5 ) { str += 'slightly-dull-' ; }
	else if ( this.saturationLevel <= -0.25 ) { str += 'subtly-dull-' ; }
	else if ( this.saturationLevel >= 3 ) { str += 'purest-' ; }
	else if ( this.saturationLevel >= 2 ) { str += 'purer-' ; }
	else if ( this.saturationLevel >= 1 ) { str += 'pure-' ; }
	else if ( this.saturationLevel >= 0.5 ) { str += 'slightly-pure-' ; }
	else if ( this.saturationLevel >= 0.25 ) { str += 'subtly-pure-' ; }

	if ( this.lightnessLevel <= -3 ) { str += 'darkest-' ; }
	else if ( this.lightnessLevel <= -2 ) { str += 'darker-' ; }
	else if ( this.lightnessLevel <= -1 ) { str += 'dark-' ; }
	else if ( this.lightnessLevel <= -0.5 ) { str += 'slightly-dark-' ; }
	else if ( this.lightnessLevel <= -0.25 ) { str += 'subtly-dark-' ; }
	else if ( this.lightnessLevel >= 3 ) { str += 'brightest-' ; }
	else if ( this.lightnessLevel >= 2 ) { str += 'brighter-' ; }
	else if ( this.lightnessLevel >= 1 ) { str += 'bright-' ; }
	else if ( this.lightnessLevel >= 0.5 ) { str += 'slightly-bright-' ; }
	else if ( this.lightnessLevel >= 0.25 ) { str += 'subtly-bright-' ; }
	
	str += this.baseName ;

	if ( this.tintRate >= 0.5 ) { str += '-tint' ; }
	else if ( this.tintRate >= 0.25 ) { str += '-slight-tint' ; }
	else if ( this.tintRate >= 0.125 ) { str += '-subtle-tint' ; }

	if ( this.toneRate >= 0.5 ) { str += '-tone' ; }
	else if ( this.toneRate >= 0.25 ) { str += '-slight-tone' ; }
	else if ( this.toneRate >= 0.125 ) { str += '-subtle-tone' ; }

	if ( this.shadeRate >= 0.5 ) { str += '-shade' ; }
	else if ( this.shadeRate >= 0.25 ) { str += '-slight-shade' ; }
	else if ( this.shadeRate >= 0.125 ) { str += '-subtle-shade' ; }

	return str ;
} ;



const MODIFIERS_KEYWORD = {
	bright: { lightnessLevel: 1 } ,
	brighter: { lightnessLevel: 2 } ,
	brightest: { lightnessLevel: 3 } ,
	dark: { lightnessLevel: -1 } ,
	darker: { lightnessLevel: -2 } ,
	darkest: { lightnessLevel: -3 } ,

	pale: { saturationLevel: -1 } , dull: { saturationLevel: -1 } ,
	paler: { saturationLevel: -2 } , duller: { saturationLevel: -2 } ,
	palest: { saturationLevel: -3 } , dullest: { saturationLevel: -3 } ,
	pure: { saturationLevel: 1 } , bold: { saturationLevel: 1 } , vivid: { saturationLevel: 1 } ,
	purer: { saturationLevel: 2 } , bolder: { saturationLevel: 2 } , vivider: { saturationLevel: 2 } ,
	purest: { saturationLevel: 3 } , boldest: { saturationLevel: 3 } , vividest: { saturationLevel: 3 } ,

	light: { lightnessLevel: 1 , saturationLevel: -1 } ,
	lighter: { lightnessLevel: 2 , saturationLevel: -2 } , pastel: { lightnessLevel: 2 , saturationLevel: -2 } ,
	lightest: { lightnessLevel: 3 , saturationLevel: -3 } ,
	deep: { lightnessLevel: -1 , saturationLevel: 1 } ,
	deeper: { lightnessLevel: -2 , saturationLevel: 2 } , royal: { lightnessLevel: -2 , saturationLevel: 2 } ,
	deepest: { lightnessLevel: -3 , saturationLevel: 3 } ,
	
	dim: { opacityLevel: -1 } , faint: { opacityLevel: -1 } ,
	dimmer: { opacityLevel: -2 } , fainter: { opacityLevel: -2 } ,
	dimmest: { opacityLevel: -3 } , faintest: { opacityLevel: -3 } ,

	slightly: { rate: 0.65 } , slight: { rate: 0.65 } ,
	subtly: { rate: 0.35 } , subtle: { rate: 0.35 } ,

	tint: { tintRate: 0.5 } ,
	tone: { toneRate: 0.5 } ,
	shade: { shadeRate: 0.5 } ,
} ;



Color.parse = function( str ) {
	var modRate = 1 ,
		color = new Color() ;

	for ( let colorPart of str.split( / +/g ) ) {
		let mod = MODIFIERS_KEYWORD[ colorPart ] ;

		if ( mod ) {
			if ( mod.rate ) { modRate = mod.rate ; }

			if ( mod.saturationLevel ) {
				color.saturationLevel += Math.abs( mod.saturationLevel ) === 1 ? modRate * mod.saturationLevel : mod.saturationLevel ;
			}

			if ( mod.lightnessLevel ) {
				color.lightnessLevel += Math.abs( mod.lightnessLevel ) === 1 ? modRate * mod.lightnessLevel : mod.lightnessLevel ;
			}

			if ( mod.opacityLevel ) {
				color.opacityLevel += Math.abs( mod.opacityLevel ) === 1 ? modRate * mod.opacityLevel : mod.opacityLevel ;
			}

			if ( mod.tintRate ) {
				color.tintRate += modRate * mod.tintRate ;
			}

			if ( mod.toneRate ) {
				color.toneRate += modRate * mod.toneRate ;
			}

			if ( mod.shadeRate ) {
				color.shadeRate += modRate * mod.shadeRate ;
			}

			// Rate modifiers only adjust the next modifier keyword
			if ( ! mod.rate ) { modRate = 1 ; }
		}
		else {
			color.baseName = colorPart ;
		}
	}
	
	return color ;
} ;

