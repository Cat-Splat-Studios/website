import React, { useState } from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Image from 'react-bootstrap/Image';
import logo from '../images/CSSLogo.png';
import Sample from '../images/sample.svg';
import Zoom from 'react-reveal/Zoom';
import Container from 'react-bootstrap/Container';

function MainPage()
{

    const imgAboutStyle =
    {
        borderRadius: "20%",
        height: "100px",
        margin: "10px"
    };

    const descrptionStyle =
    {
        margin: "10px", 
        opacity: "50%"
    };

    const topContainer =
    {
        display: "inline-flex",
        flexDirection: "column",
        backgroundColor: "black",
        color: "white",
        position: "relative",
        margin: "auto",
        width: "100%",
        alignItems: "center",
        margin: "auto",
        padding: "10px"
    };

    const contentStyle =
    {
        display: "inline-block",
        backgroundColor: "gainsboro",
        flexDirection: "column",
        position: "relative",
        margin: "auto",
        padding: "auto"
    }

    const [display, setDisplay] = useState(
    <React.Fragment>
    <Image rounded src={logo} width="400"/>
    <p>Cat Splat Studios is an aspiring team of developers who are looking 
    to break into the Video Game Industry. Our main focus will be to 
    deliver great gameplay experiences for all platforms, while maintaining 
    a small footprint in terms of overhead costs. Our vision is not to 
    re-invent the wheel, but to find different and interesting ways to celebrate
    the familiar tropes that we enjoy.</p>
    </React.Fragment>);



    return(
    <section className="Content" style={contentStyle}>
    <Zoom>
    {display}
    </Zoom>

    <Row className="justify-content-md-center">
        <img className="mainImage" src={logo} width="150" 
        onMouseOver={() => setDisplay(
            <Zoom>
            <React.Fragment>
            <Image rounded src={logo} width="400"/>
            <p>Rocket Recover now out on Google Play!</p>
            </React.Fragment>
            </Zoom>)}
        onMouseOut={() => setDisplay(
            <Zoom>
            <React.Fragment>
            <Image rounded src={logo} width="400"/>
            <p>Cat Splat Studios is an aspiring team of developers who are looking 
            to break into the Video Game Industry. Our main focus will be to 
            deliver great gameplay experiences for all platforms, while maintaining 
            a small footprint in terms of overhead costs. Our vision is not to 
            re-invent the wheel, but to find different and interesting ways to celebrate
            the familiar tropes that we enjoy.</p>
            </React.Fragment>
            </Zoom>)}
        />

        <img className="mainImage" src={logo} width="150" 
        onMouseOver={() => setDisplay(
            <Zoom>
            <React.Fragment>
            <Image rounded src={logo} width="400"/>
            <p>Quick Links Coming Soon</p>
            </React.Fragment>
            </Zoom>)}
        onMouseOut={() => setDisplay(
            <Zoom>
            <React.Fragment>
            <Image rounded src={logo} width="400"/>
            <p>Cat Splat Studios is an aspiring team of developers who are looking 
            to break into the Video Game Industry. Our main focus will be to 
            deliver great gameplay experiences for all platforms, while maintaining 
            a small footprint in terms of overhead costs. Our vision is not to 
            re-invent the wheel, but to find different and interesting ways to celebrate
            the familiar tropes that we enjoy.</p>
            </React.Fragment>
            </Zoom>)}
        />

        <img className="mainImage" src={logo} width="150" 
        onMouseOver={() => setDisplay(
            <Zoom>
            <React.Fragment>
            <Image rounded src={logo} width="400"/>
            <p>Codename: Shifter - Pre-Alpha</p>
            </React.Fragment>
            </Zoom>)}
        onMouseOut={() => setDisplay(
            <Zoom>
            <React.Fragment>
            <Image rounded src={logo} width="400"/>
            <p>Cat Splat Studios is an aspiring team of developers who are looking 
            to break into the Video Game Industry. Our main focus will be to 
            deliver great gameplay experiences for all platforms, while maintaining 
            a small footprint in terms of overhead costs. Our vision is not to 
            re-invent the wheel, but to find different and interesting ways to celebrate
            the familiar tropes that we enjoy.</p>
            </React.Fragment>
            </Zoom>)}
        />
    </Row>
    

    <div className="AboutUs">
    <hr style={{borderTop: '3px solid black', width: '80%'}} />
    <h1 style={{fontWeight: "bold", marginBottom: "5px"}}>Meet The Team!</h1>
    <hr style={{borderTop: '3px solid black', width: '80%'}} />
    <Row>
        <Col xs={12} lg={true}>
            <img style={imgAboutStyle} src={Sample} alt="Hisham" />   
            <div style={descrptionStyle}>
            <h4>Hisham Ata</h4>
            <hr style={{borderTop: '3px solid blue', width: '50%'}} />
            <h6>Founder - Business Operations Manager</h6>
            <p style={{fontSize: "15px", paddingLeft: '100px', paddingRight: '100px', paddingTop: '20px'}}>Hisham Ata founded Cat Splat Studios in 2015. 
            His background in programming, IT and project management he manages the business operations of Cat Splat Studios.</p>
            </div>  
        </Col>

        <Col xs={12} lg={true}>
            <img style={imgAboutStyle} src={Sample} alt="Hisham" />
            <div style={descrptionStyle}>
            <h4>Kyle Skidmore</h4>
            <hr style={{borderTop: '3px solid blue', width: '50%'}} />
            <h6>Project Manager - Game Designer</h6>
            <p style={{fontSize: "15px", paddingLeft: '100px', paddingRight: '100px', paddingTop: '20px'}}>Kyle Skidmore is the project manager and part of the design team. He combines his business and game design experience to bring a unique 
            perspective to our design team.</p>
            </div>
        </Col>

        <Col xs={12} lg={true}>
            <img style={imgAboutStyle} src={Sample} alt="Hisham" />
            <div style={descrptionStyle}>
            <h4>Matthew Douglas</h4>
            <hr style={{borderTop: '3px solid blue', width: '50%'}} />
            <h6>Technical Director</h6>
            <p style={{fontSize: "15px", paddingLeft: '100px', paddingRight: '100px', paddingTop: '20px'}}>Matthew Douglas is a software developer who excels in game applications. His drive to bring the best experience to the user has given him skills 
            developing many gameplay mechanics.</p>
            </div>
        </Col>
    </Row>
    </div>


    </section>

    );

}

export default MainPage;