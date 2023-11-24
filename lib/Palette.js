/*
	Terminal Kit

	Copyright (c) 2009 - 2022 Cédric Ronvel

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



const chromajs = require( 'chroma-js' ) ;



const DEFAULT_BASE_COLORS = [
	{ names: [ 'red' ] , code: '#e32322' } ,
	{ names: [ 'orange' ] , code: '#f18e1c' } ,
	{ names: [ 'gold' , 'yellow-orange' , 'amber' ] , code: '#fdc60b' } ,
	{ names: [ 'yellow' ] , code: '#f4e500' } ,
	{ names: [ 'chartreuse' , 'yellow-green' ] , code: '#8cbb26' } ,
	{ names: [ 'green' ] , code: '#25ad28' } ,
	{ names: [ 'turquoise' , 'turquoise-green' ] , code: '#1bc17d' } ,
	{ names: [ 'cyan' , 'turquoise-blue' ] , code: '#0dc0cd' } ,
	{ names: [ 'blue' ] , code: '#2a60b0' } ,
	{ names: [ 'indigo' ] , code: '#3b3ba2' } ,
	{ names: [ 'violet' , 'purple' ] , code: '#713795' } ,
	{ names: [ 'magenta' ] , code: '#bd0a7d' }
] ;



const EXTRA_COLORS = [
	{ names: [ 'crimson' ] , code: '#dc143c' } ,
	{ names: [ 'vermilion' , 'cinnabar' ] , code: '#e34234' } ,
	{ names: [ 'brown' ] , code: '#a52a2a' } ,
	{ names: [ 'bronze' ] , code: '#cd7f32' } ,
	{ names: [ 'coquelicot' ] , code: '#ff3800' } ,
	//{ names: [ 'flame' ] , code: '#e25822' } ,
	//{ names: [ 'salmon' ] , code: '#ff8c69' } ,
	{ names: [ 'coral-pink' ] , code: '#f88379' } ,
	{ names: [ 'see-green' ] , code: '#2e8b57' } ,
	{ names: [ 'medium-spring-green' ] , code: '#00fa9a' } ,
	{ names: [ 'olivine' ] , code: '#9ab973' } ,
	{ names: [ 'royal-blue' ] , code: '#4169e1' } ,
	{ names: [ 'purple' ] , code: '#800080' } ,
	//{ names: [ 'tyrian-purple' ] , code: '#66023c' } ,
	//{ names: [ 'purple-heart' ] , code: '#69359c' } ,
	{ names: [ 'lavender-purple' ] , code: '#967bb6' } ,
	//{ names: [ 'classic-rose' , 'light-pink' ] , code: '#fbcce7' } ,
	{ names: [ 'pink' ] , code: '#ffc0cb' }
	//{ names: [ 'lime' , 'lemon-lime' ] , code: '#bfff00' } ,
] ;



function Palette( options = {} ) {
	this.baseColors = {} ;

	this.addBaseColors( options.baseColors || DEFAULT_BASE_COLORS ) ;
}

module.exports = Palette ;



Palette.prototype.addBaseColors = function( baseColors ) {
	if ( ! baseColors || typeof baseColors !== 'object' ) { return ; }

	if ( Array.isArray( baseColors ) ) {
		for ( let colorDef of baseColors ) {
			if ( colorDef.code ) {
				if ( colorDef.name ) {
					this.baseColors[ colorDef.name ] = chromajs( colorDef.code ) ;
				}
				else if ( Array.isArray( colorDef.names ) ) {
					for ( let name of colorDef.names ) {
						this.baseColors[ name ] = chromajs( colorDef.code ) ;
					}
				}
			}
		}
	}
	else {
		for ( let name in baseColors ) {
			let colorDef = baseColors[ name ] ;
			
			if ( colorDef.code ) {
				this.baseColors[ colorDef.name ] = chromajs( colorDef.code ) ;
			}
		}
	}
} ;



Palette.prototype.getHex = function( colorObject ) {
	var chromaColor = this.baseColors[ colorObject.baseName ] ;
	if ( ! chromaColor ) { return null ; }
	
	if ( colorObject.saturationLevel || colorObject.lightnessLevel ) {
		chromaColor = this.adjustSaturationAndLightness( chromaColor , colorObject.saturationLevel || 0  , colorObject.lightnessLevel || 0 ) ;
	}

	return chromaColor.hex() ;
} ;



Palette.prototype.getRgb = function( colorObject ) {
	var chromaColor = this.baseColors[ colorObject.baseName ] ;
	if ( ! chromaColor ) { return null ; }
	
	if ( colorObject.saturationLevel || colorObject.lightnessLevel ) {
		chromaColor = this.adjustSaturationAndLightness( chromaColor , colorObject.saturationLevel || 0 , colorObject.lightnessLevel || 0 ) ;
	}

	var [ r , g , b ] = chromaColor.rgb() ;
	return { r , g , b } ;
} ;



const FIX_STEP = 1.1 ;

Palette.prototype.adjustSaturationAndLightness = function( chromaColor , saturationLevel , lightnessLevel , fixRgb = true ) {
	var c , l , rgb , avg , sortedChannels , preserveLOverC ;

	if ( ! saturationLevel && ! lightnessLevel ) { return chromaColor ; }

	c = chromaColor.get( 'hcl.c' ) ;
	l = chromaColor.get( 'hcl.l' ) ;

	/*
	c += c * saturationLevel / 3 ;
	l += l * lightnessLevel / 4 ;
	//*/

	c *= ( saturationLevel > 0 ? 1.6 : 1.7 ) ** saturationLevel ;
	l *= ( lightnessLevel > 0 ? 1.2 : 1.35 ) ** lightnessLevel ;

	chromaColor = chromaColor.set( 'hcl.c' , c ).set( 'hcl.l' , l ) ;

	if ( ! fixRgb || ! chromaColor.clipped ) { return chromaColor ; }

	// RGB is clipped and should be fixed.
	// The most critical part is when the hue get changed, since it's arguably the most important information.
	// Lightness is somewhat important too, but less than hue and a bit more than the Chroma.
	// Chroma will be preserved if the adjustement is greater on it than on lightness.

	//preserveLOverC = Math.abs( lightnessLevel ) >= Math.abs( saturationLevel ) ;
	preserveLOverC = Math.abs( lightnessLevel ) >= saturationLevel ;

	for ( ;; ) {
		// chromaColor.clipped is not reliable since integer rounding counts as clipping...
		rgb = chromaColor._rgb._unclipped ;
		rgb.length = 3 ;

		if ( rgb.every( channel => channel > -5 && channel < 260 ) ) { return chromaColor ; }

		sortedChannels = [ ... rgb ].sort() ;

		//console.log( "Clipped!" , rgb , chromaColor.rgb() ) ;

		if ( sortedChannels[ 2 ] >= 256 ) {
			// Clipping will affect hue!
			avg = ( sortedChannels[ 0 ] + sortedChannels[ 1 ] + sortedChannels[ 2 ] ) / 3 ;

			if ( preserveLOverC ) {
				// Desaturate a bit and retry
				c = chromaColor.get( 'hcl.c' ) ;
				c /= FIX_STEP ;
				chromaColor = chromaColor.set( 'hcl.c' , c ) ;
			}
			else {
				// Darken a bit and retry
				l = chromaColor.get( 'hcl.l' ) ;
				l /= FIX_STEP ;
				chromaColor = chromaColor.set( 'hcl.l' , l ) ;
			}

			// It was too bright anyway, let it be clipped
			if ( avg > 255 ) { return chromaColor ; }
		}
		else if ( sortedChannels[ 1 ] < 0 ) {
			// Clipping will affect hue!
			avg = ( sortedChannels[ 0 ] + sortedChannels[ 1 ] + sortedChannels[ 2 ] ) / 3 ;

			if ( preserveLOverC ) {
				// Desaturate a bit and retry
				c = chromaColor.get( 'hcl.c' ) ;
				c /= FIX_STEP ;
				chromaColor = chromaColor.set( 'hcl.c' , c ) ;
			}
			else {
				// Lighten a bit and retry
				l = chromaColor.get( 'hcl.l' ) ;
				l *= FIX_STEP ;
				chromaColor = chromaColor.set( 'hcl.l' , l ) ;
			}

			// It was too dark anyway, let it be clipped
			if ( avg < 0 ) { return chromaColor ; }
		}
		else {
			// This clipping (lowest channel below 0) will not affect hue, only lightness, let it be clipped
			return chromaColor ;
		}
	}
} ;

