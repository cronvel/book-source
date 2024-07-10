#!/usr/bin/env node
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



const bookSource = require( '..' ) ;
const HtmlRenderer = require( 'book-source-html-renderer' ) ;

const highlight = require( 'highlight.js' ) ;

const fs = require( 'fs' ) ;
const path = require( 'path' ) ;

const kungFig = require( 'kung-fig' ) ;

//const inspect = require( 'string-kit/lib/inspect.js' ).inspect ;
//const inspectOptions = { style: 'color' , depth: 10 , outputMaxLength: 100000 } ;

const cliManager = require( 'utterminal' ).cli ;



function cli() {
	/* eslint-disable indent */
	var args = cliManager.package( require( '../package.json' ) )
		.app( 'Book Source' )
		.description( "Book Source CLI." )
		//.introIfTTY
		.noIntro
		.helpOption
		.camel
		.arg( 'source' ).string
			.required
			.typeLabel( '.bks or .kfg' )
			.description( "the source file, either a Book Source file or a KFG file containing all the sources and the renderer parameters." )
		.opt( [ 'output' , 'o' ] ).string
			.typeLabel( 'output-file' )
			.description( "The output file, if not present: output to stdout." )
		.opt( [ 'parse-only' , 'p' ] ).flag
			.description( "Just parse and output the structure." )
		.run() ;
	/* eslint-enable indent */

	//console.error( args ) ;

	var package_ , baseDir ,
		rawContent = '' ,
		isPackage = false ,
		cwd = process.cwd() + '/' ,
		extension = path.extname( args.source ).slice( 1 ) ;
	
	switch ( extension ) {
		case 'json' :
			isPackage = true ;
			if ( path.isAbsolute( args.source ) ) {
				baseDir = path.dirname( args.source ) + '/' ;
				package_ = require( args.source ) ;
			}
			else {
				baseDir = path.dirname( cwd + args.source ) + '/' ;
				package_ = require( cwd + args.source ) ;
			}
			break ;

		case 'kfg' :
			isPackage = true ;
			if ( path.isAbsolute( args.source ) ) {
				baseDir = path.dirname( args.source ) + '/' ;
				package_ = kungFig.load( args.source ) ;
			}
			else {
				baseDir = path.dirname( cwd + args.source ) + '/' ;
				package_ = kungFig.load( cwd + args.source ) ;
			}
			break ;

		case 'bks' :
			baseDir = cwd ;
			package_ = {
				sources: [ args.source ]
			} ;
			break ;

		default :
			cliManager.displayHelp() ;
			console.error( "Cannot load file with extension ." + extension ) ;
			process.exit( 1 ) ;
	}
	
	if ( ! Array.isArray( package_.sources ) || ! package_.sources.length ) {
		console.error( "No source specified in the package." ) ;
		process.exit( 1 ) ;
	}
	
	
	for ( let sourcePath of package_.sources ) {
		let sourceContent ,
			fullPath = sourcePath ;

		if ( ! path.isAbsolute( fullPath ) ) { fullPath = path.join( baseDir , fullPath ) ; }
		if ( ! path.extname( fullPath ) ) { fullPath += '.bks' ; }
		
		try {
			sourceContent = fs.readFileSync( fullPath , 'utf8' ) ;
		}
		catch ( error ) {
			console.error( "Error reading source file '" + sourcePath + "':" , error ) ;
			process.exit( 1 ) ;
		}

		if ( rawContent ) { rawContent += '\n' ; }
		rawContent += sourceContent ;
	}

	var structuredDocument = bookSource.parse( rawContent , {
		metadataParser: kungFig.parse
	} ) ;
	//console.error( "structuredDocument: " , JSON.stringify( structuredDocument , null , '    ' ) ) ; return ;

	var nbspToSharp = part => {
		//console.error( "BF:" , JSON.stringify( part.text ) ) ;
		part.text = part.text.replace( new RegExp( String.fromCharCode( 0xa0 ) , 'g' ) , '#' ) ;
		//console.error( "AFT:" , JSON.stringify( part.text ) ) ;
	}

	structuredDocument.textPostFilter( [ 'apostrophe' , 'french-typo' ] ) ;
	//structuredDocument.textPostFilter( [ 'apostrophe' , 'french-typo' , nbspToSharp ] ) ;
	//structuredDocument.postProcessText( [ 'french-typo' , nbspToSharp ] ) ;
	//console.error( JSON.stringify( structuredDocument , null , '    ' ) ) ; return ;

	if ( args.parseOnly ) {
		const inspect = require( 'string-kit/lib/inspect.js' ).inspect ;
		const inspectOptions = { style: 'color' , depth: 20 , outputMaxLength: 1000000 } ;
		console.log( inspect( inspectOptions , structuredDocument ) ) ;
		return ;
	}

	if ( ! isPackage && structuredDocument.theme && typeof structuredDocument.theme === 'object' ) {
		if ( structuredDocument.theme && typeof structuredDocument.theme === 'object' ) {
			package_.theme = structuredDocument.theme ;
		}
	}
	
	if ( ! package_.css ) { package_.css = {} ; }
	else if ( typeof package_.css === 'string' ) { package_.css = { core: package_.css } ; }

	var standaloneCss =
		package_.css.standalone ? fs.readFileSync( package_.css.standalone , 'utf8' ) :
		HtmlRenderer.getBuiltinCssSync( 'standalone' ) ;

	var coreCss =
		package_.css.core ? fs.readFileSync( package_.css.core , 'utf8' ) :
		HtmlRenderer.getBuiltinCssSync( 'core' ) ;

	var codeCss =
		package_.css.code ? fs.readFileSync( package_.css.code , 'utf8' ) :
		HtmlRenderer.getBuiltinCssSync( 'code' ) ;

	var theme = ! package_.theme || typeof package_.theme !== 'object' ? new bookSource.Theme() :
		new bookSource.Theme( package_.theme ) ;

	var htmlRenderer = new HtmlRenderer(
		theme ,
		{
			standalone: true ,
			standaloneCss ,
			coreCss ,
			codeCss ,
			codeHighlighter: ( text , lang ) => highlight.highlight( text , { language: lang } ).value
		}
	) ;

	var html = structuredDocument.render( htmlRenderer ) ;

	if ( ! args.output ) {
		console.log( html ) ;
		return ;
	}
	
	try {
		fs.writeFileSync( args.output , html , 'utf8' ) ;
	}
	catch ( error ) {
		console.error( "Error writing destination file '" + args.output + "':" , error ) ;
		process.exit( 1 ) ;
	}
}

cli() ;

