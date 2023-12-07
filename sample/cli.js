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



const StructuredText = require( '../lib/StructuredText.js' ) ;

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
		.arg( 'source' ).string
			.required
			.typeLabel( '.bks or .kfg' )
			.description( "the source file, either a Book Source file or a KFG file containing all the sources and the renderer parameters." )
		.opt( [ 'output' , 'o' ] ).string
			.typeLabel( 'output-file' )
			.description( "The output file, if not present: output to stdout." )
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

	var structuredText = StructuredText.parse( rawContent , {
		metadataParser: kungFig.parse
	} ) ;

	if ( ! package_.css ) { package_.css = {} ; }
	else if ( typeof package_.css === 'string' ) { package_.css = { core: package_.css } ; }

	if ( ! package_.css.standalone ) { package_.css.standalone = path.join( __dirname , '../css/standalone.css' ) ; }
	if ( ! package_.css.core ) { package_.css.core = path.join( __dirname , '../css/core.css' ) ; }
	if ( ! package_.css.code ) { package_.css.code = path.join( __dirname , '../css/code.css' ) ; }

	var standaloneCss = fs.readFileSync( package_.css.standalone , 'utf8' ) ;
	var coreCss = fs.readFileSync( package_.css.core , 'utf8' ) ;
	var codeCss = fs.readFileSync( package_.css.code , 'utf8' ) ;

	var html = structuredText.toHtml( {
			//palette: { blue: '#bbaa00' } ,
			//colors: { linkText: '$teal' , hoverLinkText: '$orange' , visitedLinkText: '$red' } ,
			//sizes: { text: '18px' } ,
			//fonts: { main: 'monospace' } ,
		} ,
		{ standalone: true , standaloneCss , coreCss , codeCss }
	) ;

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

