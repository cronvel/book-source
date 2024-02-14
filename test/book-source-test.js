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

/* global expect, describe, it, before, after */



const bookSource = require( '..' ) ;



describe( "Nested inline markup" , function() {
	
	it( "emphasis and backslash" , () => {
		var doc = bookSource.parse( "*Emphasis with \\* char*" ) ;
		//log( "%[10]Y" , doc.parts ) ;
		expect( doc.parts ).to.be.like( [
			{
				type: "paragraph" ,
				parts: [
					{
						type: "emphasisText" ,
						level: 1 ,
						parts: [
							{
								type: "text" ,
								text: "Emphasis with * char"
							}
						]
					}
				]
			}
		] ) ;
	} ) ;

	it( "decorated text and backslash" , () => {
		var doc = bookSource.parse( "_Decorated text with \\* char_" ) ;
		//log( "%[10]Y" , doc.parts ) ;
		expect( doc.parts ).to.be.like( [
			{
				type: "paragraph" ,
				parts: [
					{
						type: "decoratedText" ,
						level: 1 ,
						underline: true ,
						parts: [
							{
								type: "text" ,
								text: "Decorated text with * char"
							}
						]
					}
				]
			}
		] ) ;
	} ) ;

	it( "styled text and backslash" , () => {
		var doc = bookSource.parse( "[Styled text with \\* char]<blue>" ) ;
		//log( "%[10]Y" , doc.parts ) ;
		expect( doc.parts ).to.be.like( [
			{
				type: "paragraph" ,
				parts: [
					{
						type: "styledText" ,
						style: {
							backgroundColor: null ,
							bold: null ,
							italic: null ,
							underline: null ,
							textColor: {
								baseName: "blue" ,
								lightnessLevel: 0 ,
								opacityLevel: 0 ,
								saturationLevel: 0 ,
								shadeRate: 0 ,
								tintRate: 0 ,
								toneRate: 0
							}
						} ,
						parts: [
							{
								type: "text" ,
								text: "Styled text with * char"
							}
						]
					}
				]
			}
		] ) ;
	} ) ;

	it( "link and backslash" , () => {
		var doc = bookSource.parse( "[Link with \\* char](example.com/welcome)" ) ;
		//log( "%[10]Y" , doc.parts ) ;
		expect( doc.parts ).to.be.like( [
			{
				type: "paragraph" ,
				parts: [
					{
						type: "link" ,
						href: "example.com/welcome" ,
						parts: [
							{
								type: "text" ,
								text: "Link with * char"
							}
						]
					}
				]
			}
		] ) ;
	} ) ;
} ) ;

