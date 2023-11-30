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



const chromajs = require( 'chroma-js' ) ;



const DEFAULT_BASE_COLORS = [
	{ names: [ 'black' ] , code: '#24292e' } ,
	{ names: [ 'white' ] , code: '#ffffff' } ,
	{ names: [ 'gray' , 'grey' ] , code: '#74797e' } ,

	{ names: [ 'red' ] , code: '#e32322' } ,
	{ names: [ 'orange' ] , code: '#f18e1c' } ,
	{ names: [ 'yellow-orange' , 'orange-yellow' , 'gold' , 'amber' ] , code: '#fdc60b' } ,
	{ names: [ 'yellow' ] , code: '#f4e500' } ,
	{ names: [ 'yellow-green' , 'green-yellow' , 'chartreuse' ] , code: '#8cbb26' } ,
	{ names: [ 'green' ] , code: '#25ad28' } ,
	{ names: [ 'blue-green' , 'green-blue' , 'turquoise' , 'turquoise-green' , 'teal' ] , code: '#1bc17d' } ,
	{ names: [ 'cyan' , 'turquoise-blue' ] , code: '#0dc0cd' } ,
	{ names: [ 'blue' ] , code: '#2a60b0' } ,
	{ names: [ 'violet-blue' , 'blue-violet' , 'indigo' ] , code: '#3b3ba2' } ,
	{ names: [ 'violet' , 'purple' ] , code: '#713795' } ,
	{ names: [ 'red-violet' , 'violet-red' , 'magenta' ] , code: '#bd0a7d' }
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



Palette.prototype.has = function( colorObject ) {
	return !! this.baseColors[ colorObject.baseName ] ;
} ;



Palette.prototype.getHex = function( colorObject ) {
	var chromaColor = this.baseColors[ colorObject.baseName ] ;
	if ( ! chromaColor ) { return null ; }
	
	if ( colorObject.hasModifier() ) {
		chromaColor = Palette.adjust( chromaColor , colorObject ) ;
	}

	return chromaColor.hex() ;
} ;



Palette.prototype.getRgb = function( colorObject ) {
	var chromaColor = this.baseColors[ colorObject.baseName ] ;
	if ( ! chromaColor ) { return null ; }
	
	if ( colorObject.hasModifier() ) {
		chromaColor = Palette.adjust( chromaColor , colorObject ) ;
	}

	var [ r , g , b ] = chromaColor.rgb() ;
	return { r , g , b } ;
} ;



const LCH_L_STEP = 18 ;
const LCH_C_STEP = 18 ;

/*
	Chroma-js .brighten()/.darken() uses a +/- 18 increment on L of the LCH colorspace,
	while .saturate()/.desaturate() also uses +/- 18 on C of the LCH colorspace.
*/
Palette.adjust = function( chromaColor , colorObject ) {
	if ( colorObject.tintRate ) { chromaColor = chromajs.mix( chromaColor , '#ffffff' , colorObject.tintRate ) ; }
	else if ( colorObject.toneRate ) { chromaColor = chromajs.mix( chromaColor , '#808080' , colorObject.toneRate ) ; }
	else if ( colorObject.shadeRate ) { chromaColor = chromajs.mix( chromaColor , '#000000' , colorObject.shadeRate ) ; }

	var lch = chromaColor.lch() ;

	// The order matter, because of clipping, it's best to apply brightness AFTER, because it's more important
	//if ( colorObject.saturationLevel ) { chromaColor = chromaColor.saturate( colorObject.saturationLevel ) ; }
	//if ( colorObject.lightnessLevel ) { chromaColor = chromaColor.brighten( colorObject.lightnessLevel ) ; }

	if ( colorObject.lightnessLevel ) { lch[ 0 ] += LCH_L_STEP * colorObject.lightnessLevel ; }
	if ( colorObject.saturationLevel ) { lch[ 1 ] += LCH_C_STEP * colorObject.saturationLevel ; }

	chromaColor = chromajs( ... lch , 'lch' ) ;
	if ( chromaColor._clipped ) {
		console.log( "BF clip:" , chromaColor , lch ) ;
		chromaColor = Palette.cleanClip( chromaColor , lch ) ;
		console.log( "AFT clip:" , chromaColor , lch ) ;
	}

	return chromaColor ;
} ;



/*
	Max LCH's L is 100.
	Max LCH's C is 134 for pure blue (120 for pure green and 105 for pure red)
*/
Palette.cleanClip = function( chromaColor , lch ) {
	// First, clip excessive LCH values...
	if ( lch[ 0 ] > 100 ) { lch[ 0 ] = 100 ; }
	if ( lch[ 1 ] > 134 ) { lch[ 1 ] = 134 ; }
	
	chromaColor = chromajs( ... lch , 'lch' ) ;
	if ( ! chromaColor._clipped ) { return chromaColor ; }

	var average , min , max , rgbSaturation ,
		rgb = chromaColor._rgb._unclipped ;
	
	average = ( rgb[ 0 ] + rgb[ 1 ] + rgb[ 2 ] ) / 3 ;
	min = Math.min( rgb[ 0 ] , rgb[ 1 ] , rgb[ 2 ] ) ;
	max = Math.max( rgb[ 0 ] , rgb[ 1 ] , rgb[ 2 ] ) ;
	
	return chromaColor ;
} ;

