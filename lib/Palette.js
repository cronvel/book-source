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



const DEFAULT_COLORS = {
	'black': '#24292e' ,
	'white': '#ffffff' ,
	'gray': '#74797e' ,

	'red': '#e32322' ,
	'orange': '#f18e1c' ,
	'yellow-orange': '#fdc60b' ,
	'yellow': '#f4e500' ,
	'yellow-green': '#8cbb26' ,
	'green': '#25ad28' ,
	'blue-green': '#1bc17d' ,
	'cyan': '#0dc0cd' ,
	'blue': '#2a60b0' ,
	'blue-violet': '#3b3ba2' ,
	'violet': '#713795' ,
	'red-violet': '#bd0a7d'
} ;

const DEFAULT_ALIASES = {
	'grey': 'gray' ,
	'orange-yellow': 'yellow-orange' ,
	'amber': 'yellow-orange' ,
	'gold': 'yellow-orange' ,
	'green-yellow': 'yellow-green' ,
	'chartreuse': 'yellow-green' ,
	'green-blue': 'blue-green' ,
	'turquoise': 'blue-green' ,
	'turquoise-green': 'blue-green' ,
	'teal': 'blue-green' ,
	'turquoise-blue': 'cyan' ,
	'violet-blue': 'blue-violet' ,
	'indigo': 'blue-violet' ,
	'purple': 'violet' ,
	'violet-red': 'red-violet' ,
	'magenta': 'red-violet'
} ;

const EXTRA_COLORS = {
	'crimson': '#dc143c' ,
	'vermilion': '#e34234' ,
	'brown': '#a52a2a' ,
	'bronze': '#cd7f32' ,
	'coquelicot': '#ff3800' ,
	//'flame': '#e25822' ,
	//'salmon': '#ff8c69' ,
	'coral-pink': '#f88379' ,
	'see-green': '#2e8b57' ,
	'medium-spring-green': '#00fa9a' ,
	'olivine': '#9ab973' ,
	'royal-blue': '#4169e1' ,
	'purple': '#800080' ,
	//'tyrian-purple': '#66023c' ,
	//'purple-heart': '#69359c' ,
	'lavender-purple': '#967bb6' ,
	//'classic-rose' , 'light-pink': '#fbcce7' ,
	'pink': '#ffc0cb'
	//'lime': '#bfff00' ,
} ;

const EXTRA_ALIASES = {
	'cinnabar': 'vermilion'
	//'lemon-lime': 'lime'
} ;



function Palette( params = {} ) {
	this.colors = {} ;
	this.aliases = Object.assign( {} , DEFAULT_ALIASES ) ;


	if ( params.aliases ) { this.addAliases( params.colors ) ; }

	if ( params.colors ) { this.addColors( params.colors ) ; }
	this.addColors( DEFAULT_COLORS , true ) ;
}

module.exports = Palette ;



Palette.prototype.addAliases = function( aliases ) {
	if ( ! aliases || typeof aliases !== 'object' ) { return ; }
	Object.assign( this.aliases , aliases ) ;
} ;



Palette.prototype.addColors = function( colors , ifNotExists = false ) {
	if ( ! colors || typeof colors !== 'object' ) { return ; }

	for ( let name in colors ) {
		let colorDef = colors[ name ] ;
		if ( this.aliases[ name ] ) { name =  this.aliases[ name ] ; }

		if ( colorDef && ( ! ifNotExists || ! this.colors[ name ] ) ) {
			this.colors[ name ] = chromajs( colorDef ) ;
		}
	}
} ;



Palette.prototype.has = function( colorObject ) {
	var name = colorObject.baseName ;
	if ( this.aliases[ name ] ) { name = this.aliases[ name ] ; }
	return !! this.colors[ name ] ;
} ;



Palette.prototype.getHex = function( colorObject ) {
	var name = colorObject.baseName ;
	if ( this.aliases[ name ] ) { name = this.aliases[ name ] ; }

	var chromaColor = this.colors[ name ] ;
	if ( ! chromaColor ) { return null ; }

	if ( colorObject.hasModifier() ) {
		chromaColor = Palette.adjust( chromaColor , colorObject ) ;
	}

	return chromaColor.hex() ;
} ;



Palette.prototype.getRgb = function( colorObject ) {
	var name = colorObject.baseName ;
	if ( this.aliases[ name ] ) { name = this.aliases[ name ] ; }

	var chromaColor = this.colors[ name ] ;
	if ( ! chromaColor ) { return null ; }

	if ( colorObject.hasModifier() ) {
		chromaColor = Palette.adjust( chromaColor , colorObject ) ;
	}

	var [ r , g , b ] = chromaColor.rgb() ;
	return { r , g , b } ;
} ;



const LCH_L_STEP = 18 ;
const LCH_C_STEP = 18 ;
const LCH_C_RATE_STEP = 0.25 ;

/*
	Chroma-js .brighten()/.darken() uses a +/- 18 increment on L of the LCH colorspace,
	while .saturate()/.desaturate() also uses +/- 18 on C of the LCH colorspace.
*/
Palette.adjust = function( chromaColor , colorObject ) {
	if ( colorObject.tintRate ) { chromaColor = chromajs.mix( chromaColor , '#ffffff' , colorObject.tintRate ) ; }
	else if ( colorObject.toneRate ) { chromaColor = chromajs.mix( chromaColor , '#808080' , colorObject.toneRate ) ; }
	else if ( colorObject.shadeRate ) { chromaColor = chromajs.mix( chromaColor , '#000000' , colorObject.shadeRate ) ; }

	try {
	var lch = chromaColor.lch() ;
} catch ( error ) { console.error( "?????: " , chromaColor ) ; }
	// The order matter, because of clipping, it's best to apply brightness AFTER, because it's more important
	/*
	if ( colorObject.saturationLevel ) { chromaColor = chromaColor.saturate( colorObject.saturationLevel ) ; }
	if ( colorObject.lightnessLevel ) { chromaColor = chromaColor.brighten( colorObject.lightnessLevel ) ; }
	return chromaColor ;
	//*/

	if ( colorObject.lightnessLevel ) { lch[ 0 ] = Math.max( 0 , lch[ 0 ] + LCH_L_STEP * colorObject.lightnessLevel ) ; }
	//if ( colorObject.saturationLevel ) { lch[ 1 ] = Math.max( 0 , lch[ 1 ] + LCH_C_STEP * colorObject.saturationLevel ) ; }
	if ( colorObject.saturationLevel ) { lch[ 1 ] = Math.max( 0 , lch[ 1 ] * ( 1 + LCH_C_RATE_STEP * colorObject.saturationLevel ) ) ; }

	//console.error( "Initial lch:" , lch ) ;
	chromaColor = chromajs( ... lch , 'lch' ) ;
	//return chromaColor ;

	if ( chromaColor._rgb._clipped ) {
		//console.error( "BF clip:" , chromaColor , lch ) ;
		chromaColor = Palette.cleanClip( chromaColor , lch ) ;
		//console.error( "AFT clip:" , chromaColor , lch ) ;
	}

	return chromaColor ;
} ;



// How much we sacrifice chroma over brightness, 1=reduce both with the same factor, 2=reduce twice the chroma relative to the lightness
const CHROMA_FLEXIBILITY = 3 ;

/*
	Max LCH's L is 100.
	Max LCH's C is 134 for pure blue (120 for pure green and 105 for pure red)
*/
Palette.cleanClip = function( chromaColor , lch ) {
	if ( ! chromaColor._rgb._clipped ) { return chromaColor ; }

	var lcRatio , currentLcRatio ,
		lchClipped = false ;

	// First, non-sensical or excessive LCH values...
	if ( lch[ 0 ] < 0 ) { lch[ 0 ] = 0 ; }
	if ( lch[ 1 ] < 0 ) { lch[ 1 ] = 0 ; }
	lcRatio = lch[ 0 ] / lch[ 1 ] ;

	if ( lch[ 0 ] > 100 ) { lch[ 0 ] = 100 ; lchClipped = true ; }
	if ( lch[ 1 ] > 134 ) { lch[ 1 ] = 134 ; lchClipped = true ; }

	if ( lchClipped ) {
		currentLcRatio = lch[ 0 ] / lch[ 1 ] ;
		if ( lch[ 0 ] > 0.5 && lch[ 1 ] > 0.5 && Number.isFinite( lcRatio ) && Number.isFinite( currentLcRatio ) ) {
			if ( currentLcRatio > lcRatio ) {
				lch[ 0 ] = lch[ 1 ] * lcRatio ;
			}
			else {
				lch[ 1 ] = lch[ 0 ] / lcRatio ;
			}
		}
		chromaColor = chromajs( ... lch , 'lch' ) ;
		//console.error( "After excessive pass:" , chromaColor , lch ) ;
		if ( ! chromaColor._rgb._clipped ) { return chromaColor ; }
	}

	for ( let pass = 0 ; pass < 5 ; pass ++ ) {
		let rgb = chromaColor._rgb._unclipped ;
		let average = ( rgb[ 0 ] + rgb[ 1 ] + rgb[ 2 ] ) / 3 ;
		let max = Math.max( rgb[ 0 ] , rgb[ 1 ] , rgb[ 2 ] ) ;
		let min = Math.min( rgb[ 0 ] , rgb[ 1 ] , rgb[ 2 ] ) ;
		let reverseAverage = 255 - average ;
		let reverseMax = 255 - max ;
		let reverseMin = 255 - min ;


		if (
			max > 256
			&& ( min >= - 10 || max - 255 > - min / 4 )	// <-- hacky part, see the "else" for the explanation
		) {
			let rgbSaturation = max - average ;

			// Compute the rates and apply it, it will change both the average values (lightness) and the rgb saturation
			let lRate = 255 / max ;
			let cRate = lRate ** CHROMA_FLEXIBILITY ;
			let average2 = average * lRate ;
			let rgbSaturation2 = rgbSaturation * lRate * cRate ;
			let max2 = average2 + rgbSaturation2 ;

			// So the real rate that was applied to the max channel is
			let lRate2 = max2 / max ;

			// Correct the final rates
			let powerCorrector = Math.log( lRate ) / Math.log( lRate2 ) ;
			//let lRateFinal = lRate * lRate / lRate2 ;
			let lRateFinal = lRate ** powerCorrector ;
			let cRateFinal = lRateFinal ** CHROMA_FLEXIBILITY ;

			lch[ 0 ] *= lRateFinal ;
			lch[ 1 ] *= cRateFinal ;
			//console.error( "Pass " + pass + ":" , { average , max , min , rgbSaturation , lRate , cRate , average2 , rgbSaturation2 , max2 , lRate2 , powerCorrector , lRateFinal , cRateFinal } ) ;
		}
		else if ( min < - 10 ) {
			/*
				Chroma-js has bugs with négative RGB values.
				Negative values are so insane that it's impossible to reason with.
				They grow up really quickly without any reason once the chroma exceed even slightly the limit for a specific hue.

				So the only solution is a hack.
				Just clip negative RGB values, get the resulting chroma and apply it.
				We will also pretend being happy with values ranging from 0 to -10.
			*/

			let clipped = chromajs( ... rgb.map( e => Math.max( 1 , e ) ) ) ;
			let c = lch[ 1 ] ;
			let newC = chromajs( clipped ).get( 'lch.c' ) ;
			//console.error( "Clip negative pass " + pass + ":" , clipped , { c , newC , lch: chromajs( clipped ).lch() } ) ;
			lch[ 1 ] = newC - 0.5 ;	// Let another hack, because even after getting the new C, the hue changed, and we are back to silly negative values
		}

		chromaColor = chromajs( ... lch , 'lch' ) ;
		//console.error( "After pass " + pass + ":" , chromaColor , lch ) ;
		if ( ! chromaColor._rgb._clipped ) { return chromaColor ; }
	}

	return chromaColor ;
} ;

