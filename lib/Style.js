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



function Style() {
	this.textColor = null ;
	this.backgroundColor = null ;
	this.bold = null ;
	this.italic = null ;
	this.underline = null ;
}

module.exports = Style ;



Style.merge = function( ... styles ) {
	var mergedStyle = new Style() ;

	for ( let style of styles ) {
		if ( style.textColor !== null ) { mergedStyle.textColor = style.textColor ; }
		if ( style.backgroundColor !== null ) { mergedStyle.backgroundColor = style.backgroundColor ; }
		if ( style.bold !== null ) { mergedStyle.bold = style.bold ; }
		if ( style.italic !== null ) { mergedStyle.italic = style.italic ; }
		if ( style.underline !== null ) { mergedStyle.underline = style.underline ; }
	}

	return mergedStyle ;
} ;



const BOOLEAN_PROPERTIES = new Set( [ 'bold' , 'italic' , 'underline' ] ) ;
const TEXT_COLOR_PROPERTIES = new Set( [ 'text' , 'tx' , 'foreground' , 'fg' ] ) ;
const BACKGROUND_COLOR_PROPERTIES = new Set( [ 'background' , 'bg' ] ) ;



Style.parse = function( str , forTextElement = true ) {
	var style = new Style() ;

	for ( let part of str.trim().split( /,/g ) ) {
		let [ property , value ] = part.split( ':' ) ;

		if ( value ) {
			property = TEXT_COLOR_PROPERTIES.has( property ) ? 'text' :
				BACKGROUND_COLOR_PROPERTIES.has( property ) ? 'background' :
				forTextElement ? 'text' : 'background' ;
		}
		else {
			if ( BOOLEAN_PROPERTIES.has( property ) ) {
				style[ property ] = true ;
				continue ;
			}

			value = property ;
			property = forTextElement ? 'text' : 'background' ;
		}
		
		console.error( "pv:" , property , value ) ;
		switch ( property ) {
			case 'text' :
				style.textColor = Color.parse( value ) ;
				break ;
			case 'background' :
				style.backgroundColor = Color.parse( value ) ;
				break ;
		}
	}
	
	return style ;
} ;



function Color() {
	this.baseName = '' ;
	this.saturationLevel = 0 ;
	this.lightnessLevel = 0 ;
	this.opacityLevel = 0 ;
}

Style.Color = Color ;



Color.prototype.cname = function() {
	var str = '' ;

	if ( this.opacityLevel <= -3 ) { str += 'dimmest-' ; }
	else if ( this.opacityLevel <= -2 ) { str += 'dimmer-' ; }
	else if ( this.opacityLevel <= -1 ) { str += 'dim-' ; }

	if ( this.saturationLevel <= -3 ) { str += 'dullest-' ; }
	else if ( this.saturationLevel <= -2 ) { str += 'duller-' ; }
	else if ( this.saturationLevel <= -1 ) { str += 'dull-' ; }
	else if ( this.saturationLevel >= 3 ) { str += 'pure-' ; }
	else if ( this.saturationLevel >= 2 ) { str += 'purer-' ; }
	else if ( this.saturationLevel >= 1 ) { str += 'purest-' ; }

	if ( this.lightnessLevel <= -3 ) { str += 'darkest-' ; }
	else if ( this.lightnessLevel <= -2 ) { str += 'darker-' ; }
	else if ( this.lightnessLevel <= -1 ) { str += 'dark-' ; }
	else if ( this.lightnessLevel >= 3 ) { str += 'brightest-' ; }
	else if ( this.lightnessLevel >= 2 ) { str += 'brighter-' ; }
	else if ( this.lightnessLevel >= 1 ) { str += 'bright-' ; }
	
	str += this.baseName ;

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
} ;



Color.parse = function( str ) {
	var color = new Color() ;

	for ( let colorPart of str.split( / +/g ) ) {
		let mod = MODIFIERS_KEYWORD[ colorPart ] ;

		if ( mod ) {
			if ( mod.saturationLevel ) { color.saturationLevel += mod.saturationLevel ; }
			if ( mod.lightnessLevel ) { color.lightnessLevel += mod.lightnessLevel ; }
			if ( mod.opacityLevel ) { color.opacityLevel += mod.opacityLevel ; }
		}
		else {
			color.baseName = colorPart ;
		}
	}
	
	return color ;
} ;

