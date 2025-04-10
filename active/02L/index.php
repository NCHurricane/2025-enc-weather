<!DOCTYPE html>
<html lang="en">

<head>
    <title>NCHurricane.com</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="shortcut icon" href="http://www.nchurricane.com/favicon.ico">

    <link rel="stylesheet" href="../css/w3.css">
    <link rel="stylesheet" href="../css/nch_style.css">

    <style>
        @import url('https://fonts.googleapis.com/css?family=Overpass:400,400i,700,700i&display=swap');
        @import url('https://fonts.googleapis.com/css?family=Oswald:400,700&display=swap');
    </style>

    <script src="https://kit.fontawesome.com/04fcf90301.js" crossorigin="anonymous">
    </script>
</head>

<body>
    <button onclick="topFunction()" id="myBtn" title="Go to top">Top</button>

    <!-- Search for CHANGEME: and these labels:
/xxL
$systemxx
ATxx
ALxx
/xx_ (01 - 05)
GOES16/ABI/SECTOR/xxx (Check size of file, i.e. 1800x1080)
sector.php?sat=G16&sector=xxx
_atx+ (1-5)
MIATCXXXx

WHEN NO FLOATERS ARE ACTIVE / WHEN FLOATER ARE ACTIVE (All sizes)
CATEGORY - IF HURRICANE (All sizes)
RADAR LOCATION (All sizes)
COMPOSITE RADARS (All sizes)
NWS LOCATION (All sizes)
REGIONAL LOCATION (All sizes)
    -->


    <!-- Header -->
    <header class="w3-center">
        <div id="Small_Header" class="w3-hide-large w3-hide-medium">
            <img src="../images/2020_NCH_act_sm.gif" alt="NCHurricane Logo" class="w3-image" style="width:100%; max-width:1200px; border-top-right-radius: 20px; border-top-left-radius: 20px;">
        </div>

        <div id="Large_Header" class="w3-hide-small">
            <img src="../images/2020_NCH_act.gif" alt="NCHurricane Logo" class="w3-image" style="width:100%; max-width:1200px; border-top-right-radius: 20px; border-top-left-radius: 20px;">
        </div>
    </header>

    <!-- NAVIGATION -->
    <div class="menubox altfont">
        <!-- LARGE -->
        <div class="w3-bar w3-black w3-hide-small w3-hide-medium">
            <a href="../index.php" class="w3-bar-item w3-button w3-hide-medium">HOME</a>
            <a href="../tropics.php" class="w3-bar-item w3-button w3-hide-medium w3-hide-small">CURRENT ATLANTIC TROPICAL WEATHER</a>
            <a href="../satellites.php" class="w3-bar-item w3-button w3-hide-medium w3-hide-small">SATELLITE IMAGES</a>
            <a href="../radars.php" class="w3-bar-item w3-button w3-hide-medium w3-hide-small">RADAR IMAGES</a>
            <a href="../models.php" class="w3-bar-item w3-button w3-hide-medium w3-hide-small">MODEL LINKS</a>
            <a href="../development.php" class="w3-bar-item w3-button w3-hide-medium w3-hide-small">TROPICAL DEVELOPMENT</a>
            <a href="http://easternnc.nchurricane.com/" class="w3-bar-item w3-button w3-hide-medium w3-hide-small">EASTERN NC WEATHER</a>
        </div>
        <!-- MEDIUM -->
        <div class="w3-bar w3-black">
            <a href="../index.php" class="w3-bar-item w3-button w3-hide-large">HOME</a>
            <a href="../tropics.php" class="w3-bar-item w3-button w3-hide-large w3-hide-small">CURRENT TROPICAL WEATHER</a>
            <a href="../satellites.php" class="w3-bar-item w3-button w3-hide-large w3-hide-small">SATELLITES</a>
            <a href="../radars.php" class="w3-bar-item w3-button w3-hide-large w3-hide-small">RADARS</a>
            <a href="../models.php" class="w3-bar-item w3-button w3-hide-large w3-hide-small">MODELS</a>
            <a href="../development.php" class="w3-bar-item w3-button w3-hide-large w3-hide-small">DEVELOPMENT</a>
            <a href="http://easternnc.nchurricane.com/" class="w3-bar-item w3-button w3-hide-large w3-hide-small">ENC WEATHER</a>
            <a href="javascript:void(0)" class="w3-bar-item w3-button w3-right w3-hide-large w3-hide-medium" onclick="myFunction()"><i class="fas fa-bars"></i></a>
        </div>
        <!-- SMALL -->
        <div id="nchmenu" class="w3-bar-block w3-bottombar w3-border w3-border-black w3-hide w3-hide-large w3-hide-medium">
            <div class="w3-bar-item w3-indigo">TROPICAL RESOURCES</div>
            <a href="../tropics.php" class="w3-bar-item w3-highway-red w3-button w3-small" style="padding-left: 2em">&bull;&nbsp;CURRENT ATLANTIC TROPICAL WEATHER</a>
            <a href="../satellites.php" class="w3-bar-item w3-highway-red w3-button w3-small" style="padding-left: 2em">&bull;&nbsp;SATELLITE IMAGES</a>
            <a href="../radars.php" class="w3-bar-item w3-highway-red w3-button w3-small" style="padding-left: 2em">&bull;&nbsp;RADAR IMAGES</a>
            <a href="../models.php" class="w3-bar-item w3-highway-red w3-button w3-small" style="padding-left: 2em">&bull;&nbsp;MODEL LINKS</a>
            <a href="../development.php" class="w3-bar-item w3-highway-red w3-button w3-small" style="padding-left: 2em;">&bull;&nbsp;TROPICAL DEVELOPMENT</a>
            <a href="http://easternnc.nchurricane.com/" class="w3-bar-item w3-button w3-indigo">EASTERN NC WEATHER</a>
        </div>
    </div>

    <!-- LARGE CONTENT -->
    <!-- ADJUST FOR LARGE SCREENS -->
    <div id="Large_Content" class="mainbox w3-hide-small w3-hide-medium" style="margin-top:10px;">

        <!-- SYSTEM NAME - LARGE -->
        <!-- CHANGEME: STORM NUMBER -->
        <div class="w3-container w3-jumbo w3-center w3-bold w3-text-indigo altfont" style="margin-bottom:10px;">
            <?php
            $system02 = simplexml_load_file("../xml/02L.xml");
            echo $system02->systemType;
            echo str_repeat("&nbsp;", 1);
            echo $system02->systemName;
            ?>
        </div>

        <!-- INFORMATION MENU - LARGE -->
        <div class="w3-container">
            <div class="w3-bar altfont">
                <div id="Info_Menu_Large">
                    <button class="w3-bar-item w3-button w3-border w3-large w3-border-black tablinkStorm" onclick="openStorm(event,'Current_Large')" style="border-top-left-radius: 20px; border-top-right-radius: 20px; margin-right: 2px; background: #2600ff; color: #ffffff;">

                        <!-- CHANGEME:- STORM NUMBER -->
                        <?php echo substr($system02->messageDateTimeLocal, 9); ?>&nbsp;-&nbsp;
                        <?php echo $system02->messageType; ?>
                    </button>
                    <button class="w3-bar-item w3-button w3-border w3-large w3-border-black tablinkStorm" onclick="openStorm(event,'NHCText_Large')" style="border-top-left-radius: 20px; border-top-right-radius: 20px; margin-right: 2px; background: #ffffff;">TEXT
                        PRODUCTS
                    </button>
                    <button class="w3-bar-item w3-button w3-border w3-large w3-border-black tablinkStorm" onclick="openStorm(event,'Graphics_Large')" style="border-top-left-radius: 20px; border-top-right-radius: 20px; margin-right: 2px; background: #ffffff;">GRAPHICS
                    </button>
                    <button class="w3-bar-item w3-button w3-border w3-large w3-border-black tablinkStorm" onclick="openStorm(event,'Satellite_Large')" style="border-top-left-radius: 20px; border-top-right-radius: 20px; margin-right: 2px; background: #fcfcfc;">SATELLITE
                    </button>
                </div>

                <!-- CHANGEME: LOCAL IMPACTS - w3-hide WHEN NOT IN USE  -->
                <div id="Local" class="w3-hide">
                    <button class="w3-bar-item w3-button w3-border w3-large w3-border-black tablinkStorm" onclick="openStorm(event,'Radars_Large')" style="border-top-left-radius: 20px; border-top-right-radius: 20px; margin-right: 2px; background: #ffffff;">RADARS
                    </button>
                    <button class="w3-bar-item w3-button w3-border w3-large w3-border-black tablinkStorm" onclick="openStorm(event,'Local_Large')" style="border-top-left-radius: 20px; border-top-right-radius: 20px; margin-right: 2px; background: #ffffff;">LOCAL
                        IMPACTS
                    </button>
                </div>

            </div>
        </div>

        <!-- CURRENT - LARGE -->
        <div id="Current_Large" class="w3-container w3-white w3-border-2 w3-border-indigo w3-padding Storm" style="border-radius: 20px; margin-bottom: 20px;">
            <div class="w3-row">
                <div class="w3-col" style="width: 41%;">
                    <div class="w3-text-indigo w3-padding w3-xlarge w3-text-black altfont">
                        <div>

                            <!-- CHANGEME: - CATEGORY IF Hurricane -->
                            <!-- <span
                                class="w3-xxlarge w3-text-red w3-bold"><?php echo $system02->systemSaffirSimpsonCategory; ?></span>
                            <br>-->

                            <!-- CHANGEME: - STORM NUMBER -->
                            <span class="w3-xlarge w3-text-red w3-bold">
                                <?php echo $system02->systemType; ?>
                            </span>
                        </div>
                        <br>

                        <!-- CHANGEME:- STORM NUMBER -->
                        <div id="Storm_Info_Large">
                            <span class="w3-text-black">Location:</span>&nbsp;&nbsp;
                            <?php echo $system02->centerLocLatitude; ?>N&nbsp;
                            <?php echo $system02->centerLocLongitude; ?>W
                        </div>
                        <div>
                            <span class="w3-text-black">Maximum Sustained Winds:</span>&nbsp;&nbsp;
                            <?php echo $system02->systemIntensityMph; ?> MPH
                        </div>
                        <div>
                            <span class="w3-text-black">Minimum Central Pressure:</span>&nbsp;&nbsp;
                            <?php echo $system02->systemMslpMb; ?> mb
                        </div>
                        <div>
                            <span class="w3-text-black">Moving:</span>&nbsp;&nbsp;
                            <?php echo $system02->systemDirectionOfMotion; ?>&nbsp;at&nbsp;
                            <?php echo $system02->systemSpeedMph; ?>&nbsp;MPH
                        </div>
                        <br>
                        <div>
                            <span class="w3-text-black">THE CENTER OF</span>&nbsp;
                            <?php echo $system02->systemType; ?>
                            <?php echo $system02->systemName; ?>&nbsp;IS:<br>
                            <span class="w3-large">
                                &nbsp;<?php echo $system02->systemGeoRefPt1; ?><br>
                                &nbsp;<?php echo $system02->systemGeoRefPt2; ?>
                            </span>
                        </div>
                    </div>

                </div>
                <div class="w3-rest w3-center">
                    <div class="w3-row">

                        <div class="w3-col w3-padding l6">

                            <!-- CHANGEME: - STORM NUMBER -->
                            <img src="images/blank.gif" data-src="https://www.nhc.noaa.gov/storm_graphics/AT02/AL022024_5day_cone_no_line_and_wind.png" alt="NHC 5 Day Track" style="width: 190px; height: 190px;" class="lazyload w3-border w3-border-gray w3-round"><br>
                            <div class="w3-alert w3-small altfont">
                                FIVE DAY TRACK - NHC
                            </div>
                        </div>

                        <div class="w3-col w3-padding l6">

                            <!-- CHANGEME: - w3-hide STORM NUMBER OR REGIONAL SATELLITE -->
                            <img src="images/blank.gif" id="Floater_Satellite_Lg" data-src="https://cdn.star.nesdis.noaa.gov/FLOATER/data/AL022024/13/500x500.jpg" alt="Floater Satellite" style="width: 190px; height: 190px;" class="lazyload w3-border w3-border-gray w3-round"><br>

                            <!-- CHANGEME: - w3-hide STORM NUMBER OR REGIONAL SATELLITE -->
                            <img src="images/blank.gif" id="Regional_Satellite_Lg" data-src="https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/taw/13/1800x1080.jpg" alt="Regional Satellite" style="width: 190px; height: 190px;" class="w3-hide lazyload w3-border w3-border-gray w3-round"><br>
                            <div class="w3-alert w3-small altfont">
                                FLOATER SATELLITE - NOAA
                            </div>
                        </div>

                        <div class="w3-col w3-padding l6">

                            <!-- CHANGEME: - STORM NUMBER -->
                            <img src="images/blank.gif" data-src="https://www.nhc.noaa.gov/storm_graphics/AT02/AL022024_most_likely_toa_34.png" alt="NHC Likely Arrival of Tropical Storm Force Winds" style="width: 190px; height: 190px;" class="lazyload w3-border w3-border-gray w3-round"><br>
                            <div class="w3-alert w3-small altfont">
                                LIKELY ARRIVAL OF 34 KT+ WINDS - NHC
                            </div>
                        </div>

                        <!-- CHANGEME: - w3-hide WHEN NOT WITHIN RANGE OF COAST -->
                        <div class="w3-hide w3-col w3-padding l6">
                            <!-- CHANGEME: - RADAR LOCATION -->
                            <img src="images/blank.gif" data-src="https://radar.weather.gov/lite/N0R/LTX_0.png" alt="Local Radar" style="width: 190px; height: 190px;" class="lazyload w3-border w3-border-gray w3-round">
                            <br>
                            <div class="w3-alert w3-small altfont">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                WILMINGTON, NC RADAR - NWS
                            </div>
                        </div>
                    </div>
                </div>
                <div class="w3-col w3-center">
                    <a href="https://www.nhc.noaa.gov/" target="_blank" class="w3-button w3-indigo w3-small w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;INFORMATION FROM THE NATIONAL HURRICANE CENTER</a>
                </div>
            </div>
        </div>

        <!-- TEXT - LARGE -->
        <div id="NHCText_Large" class="w3-container w3-white w3-border-2 w3-border-indigo w3-padding Storm" style="border-radius: 20px; display:none; margin-bottom: 20px;">
            <div class="w3-row">
                <div class="w3-col w3-left w3-alert altfont" style="width:40%">
                    <div class="w3-alert w3-bar w3-bar-block">
                        <button class="w3-alert w3-hide tablinkText" onclick="openText(event,'Text0')">&nbsp;
                        </button>
                        <div class="w3-alert w3-xlarge w3-padding w3-text-indigo w3-bold" style="text-decoration: underline;">NHC
                            ADVISORIES
                        </div>
                        <button class="w3-bar-item w3-button w3-round-large w3-large tablinkText" onclick="openText(event,'Text1')">PUBLIC
                            ADVISORY</button>
                        <button class="w3-bar-item w3-button w3-round-large w3-large tablinkText" onclick="openText(event,'Text2')">DISCUSSION</button>
                        <button class="w3-bar-item w3-button w3-round-large w3-large tablinkText" onclick="openText(event,'Text3')">FORECAST
                            ADVISORY</button>
                        <button class="w3-bar-item w3-button w3-round-large w3-large tablinkText" onclick="openText(event,'Text4')">WIND SPEED
                            PROBABILITIES</button>

                        <!-- CHANGEME: - w3-hide WHEN NO WATCHES/WARNINGS ISSUED -->
                        <button class="w3-hide w3-bar-item w3-button w3-round-large w3-large tablinkText" onclick="openText(event,'Text5')">TROPICAL
                            CYCLONE BREAKPOINTS</button>

                        <button class="w3-bar-item w3-button w3-round-large w3-large tablinkText" onclick="openText(event,'Text6')">ICAO (AVIATION)
                            ADVISORY</button>
                        <button class="w3-hide w3-bar-item w3-button w3-round-large w3-large tablinkText" onclick="openText(event,'Text7')">AVISO PÚBLICO DE
                            ATLÁNTICO</button>
                    </div>
                </div>

                <div class="w3-rest w3-alert">
                    <div id="Text0" class="w3-container w3-center Text">
                        <img src="images/blank.gif" data-src="../images/text_card.gif" alt="Placecard" style="width:100%; max-width:400px;" class="lazyload w3-center">
                    </div>

                    <div id="Text1" class="w3-display-container w3-regular Text" style="display:none;">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkText" onclick="openText(event,'Text0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <!-- CHANGEME: - STORM NUMBER -->
                        <div class="w3-container">
                            <div>
                                <a href="https://www.nhc.noaa.gov/" target="_blank" class="w3-button w3-indigo w3-small w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                            </div>
                            <!-- CHANGEME: - STORM NUMBER -->
                            <?php
                            $pub3 = simplexml_load_file("../xml/02_public.xml");
                            echo $pub3->channel->item->description;
                            ?>
                        </div>
                    </div>

                    <div id="Text2" class="w3-display-container w3-regular Text" style="display:none;">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkText" onclick="openText(event,'Text0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <div class="w3-container">
                            <div>
                                <a href="https://www.nhc.noaa.gov/" target="_blank" class="w3-button w3-indigo w3-small w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                            </div>
                            <!-- CHANGEME: - STORM NUMBER -->
                            <?php
                            $disc3 = simplexml_load_file("../xml/02_discussion.xml");
                            echo $disc3->channel->item->description;
                            ?>
                        </div>
                    </div>

                    <div id="Text3" class="w3-display-container w3-regular Text" style="display:none;">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkText" onclick="openText(event,'Text0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <div class="w3-container">
                            <div>
                                <a href="https://www.nhc.noaa.gov/" target="_blank" class="w3-button w3-indigo w3-small w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                            </div>
                            <!-- CHANGEME: - STORM NUMBER -->
                            <?php
                            $fore3 = simplexml_load_file("../xml/02_forecast.xml");
                            echo $fore3->channel->item->description;
                            ?>
                        </div>
                    </div>

                    <div id="Text4" class="w3-display-container w3-regular Text" style="display:none;">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkText" onclick="openText(event,'Text0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <div class="w3-container">
                            <div>
                                <a href="https://www.nhc.noaa.gov/" target="_blank" class="w3-button w3-indigo w3-small w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                            </div>
                            <!-- CHANGEME: - STORM NUMBER -->
                            <?php
                            $wind3 = simplexml_load_file("../xml/02_wind.xml");
                            echo $wind3->channel->item->description;
                            ?>
                        </div>
                    </div>

                    <div id="Text5" class="w3-display-container w3-regular Text" style="display:none;">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkText" onclick="openText(event,'Text0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <div class="w3-container">
                            <div>
                                <a href="https://www.nhc.noaa.gov/" target="_blank" class="w3-button w3-indigo w3-small w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                            </div>
                            <!-- CHANGEME: - STORM NUMBER -->
                            <?php
                            $wwa3 = simplexml_load_file("../xml/02_breakpoints.xml");
                            echo $wwa3->channel->item->description;
                            ?>
                        </div>
                    </div>

                    <div id="Text6" class="w3-display-container w3-regular Text" style="display:none;">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkText" onclick="openText(event,'Text0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <div class="w3-container">
                            <div>
                                <a href="https://www.nhc.noaa.gov/" target="_blank" class="w3-button w3-indigo w3-small w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                            </div>
                            <!-- CHANGEME: - STORM NUMBER -->
                            <?php
                            $avia3 = simplexml_load_file("../xml/02_aviation.xml");
                            echo $avia3->channel->item->description;
                            ?>
                        </div>
                    </div>

                    <div id="Text7" class="w3-display-container w3-regular Text" style="display:none;">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkText" onclick="openText(event,'Text0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <div class="w3-container">
                            <div>
                                <a href="https://www.nhc.noaa.gov/" target="_blank" class="w3-button w3-indigo w3-small w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                            </div>
                            <!-- CHANGEME: - STORM NUMBER -->
                            <?php
                            $esp3 = simplexml_load_file("../xml/02_espanol.xml");
                            echo $esp3->channel->item->description;
                            ?>
                        </div>
                    </div>
                </div>

            </div>
        </div>

        <!-- GRAPHICS - LARGE -->
        <div id="Graphics_Large" class="w3-container w3-white w3-border-2 w3-border-indigo w3-padding Storm" style="border-radius: 20px; display:none; margin-bottom: 20px;">
            <div class="w3-row">
                <div class="w3-col w3-left w3-alert altfont" style="width:40%;">
                    <div class="w3-alert w3-bar w3-bar-block">
                        <div class="w3-alert w3-xlarge w3-padding w3-text-indigo w3-bold" style="text-decoration: underline;">STORM GRAPHICS
                        </div>
                        <button class="w3-hide w3-bar-item tablinkGraphic" onclick="openGraphic(event,'Graphic0')">&nbsp; </button>
                        <button class="w3-bar-item w3-button w3-large w3-round-large tablinkGraphic" onclick="openGraphic(event,'Graphic1')">3-DAY FORECAST</button>
                        <button class="w3-bar-item w3-button w3-large w3-round-large tablinkGraphic" onclick="openGraphic(event,'Graphic2')">5-DAY FORECAST</button>
                        <button class="w3-bar-item w3-button w3-large w3-round-large tablinkGraphic" onclick="openGraphic(event,'Graphic3')">CURRENT WINDS</button>
                        <button class="w3-bar-item w3-button w3-large w3-round-large tablinkGraphic" onclick="openGraphic(event,'Graphic4')">WIND SWATH</button>
                        <button class="w3-bar-item w3-button w3-large w3-round-large tablinkGraphic" onclick="openGraphic(event,'Graphic5')">LIKELY ARRIVAL OF TS WINDS</button>
                        <button class="w3-bar-item w3-button w3-large w3-round-large tablinkGraphic" onclick="openGraphic(event,'Graphic6')">EARLIEST ARRIVAL OF TS WINDS</button>
                        <button class="w3-bar-item w3-button w3-large w3-round-large tablinkGraphic" onclick="openGraphic(event,'Graphic7')">TS FORCE WINDS PROBABILITY</button>
                        <button class="w3-bar-item w3-button w3-large w3-round-large tablinkGraphic" onclick="openGraphic(event,'Graphic8')">50-KNOT WINDS PROBABILITY</button>
                        <button class="w3-bar-item w3-button w3-large w3-round-large tablinkGraphic" onclick="openGraphic(event,'Graphic9')">HURRICANE-FORCE WINDS
                            PROBABILITY</button>
                    </div>
                </div>

                <div class="w3-rest w3-alert">
                    <div id="Graphic0" class="w3-container w3-center Graphic">
                        <img src="images/blank.gif" data-src="../images/sat_card.gif" alt="Placecard" style="width:100%; max-width:400px;" class="lazyload">
                    </div>

                    <div id="Graphic1" class="w3-display-container w3-regular Graphic" style="display:none;">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkGraphic" onclick="openGraphic(event,'Graphic0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <div class="w3-alert w3-center">
                            <!-- CHANGEME: - STORM NUMBER -->
                            <img src="images/blank.gif" data-src="https://www.nhc.noaa.gov/storm_graphics/AT02/AL022024_3day_cone_no_line_and_wind.png" alt="NHC 3 Day Track" style="width:100%; max-width:650px;" class="lazyload">
                            <div>
                                <a href="https://www.nhc.noaa.gov/" target="_blank" class="w3-button w3-indigo w3-small w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                            </div>
                        </div>
                    </div>

                    <div id="Graphic2" class="w3-display-container w3-regular Graphic" style="display:none;">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkGraphic" onclick="openGraphic(event,'Graphic0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <div class="w3-alert w3-center">
                            <!-- CHANGEME: - STORM NUMBER -->
                            <img src="images/blank.gif" data-src="https://www.nhc.noaa.gov/storm_graphics/AT02/AL022024_5day_cone_no_line_and_wind.png" alt="NHC 5 Day Track" style="width:100%; max-width:650px;" class="lazyload">
                            <div>
                                <a href="https://www.nhc.noaa.gov/" target="_blank" class="w3-button w3-indigo w3-small w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                            </div>
                        </div>
                    </div>

                    <div id="Graphic3" class="w3-display-container w3-regular Graphic" style="display:none;">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkGraphic" onclick="openGraphic(event,'Graphic0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <div class="w3-alert w3-center">
                            <!-- CHANGEME: - STORM NUMBER -->
                            <img src="images/blank.gif" data-src="https://www.nhc.noaa.gov/storm_graphics/AT02/AL022024_current_wind.png" alt="NHC Current Winds" style="width:100%; max-width:650px;" class="lazyload">
                            <div>
                                <a href="https://www.nhc.noaa.gov/" target="_blank" class="w3-button w3-indigo w3-small w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                            </div>
                        </div>
                    </div>

                    <div id="Graphic4" class="w3-display-container w3-regular Graphic" style="display:none;">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkGraphic" onclick="openGraphic(event,'Graphic0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <div class="w3-alert w3-center">
                            <!-- CHANGEME: - STORM NUMBER -->
                            <img src="images/blank.gif" data-src="https://www.nhc.noaa.gov/storm_graphics/AT02/AL022024_wind_history.png" alt="NHC Wind History" style="width:100%; max-width:650px;" class="lazyload">
                            <div>
                                <a href="https://www.nhc.noaa.gov/" target="_blank" class="w3-button w3-indigo w3-small w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                            </div>
                        </div>
                    </div>

                    <div id="Graphic5" class="w3-display-container w3-regular Graphic" style="display:none;">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkGraphic" onclick="openGraphic(event,'Graphic0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <div class="w3-alert w3-center">
                            <!-- CHANGEME: - STORM NUMBER -->
                            <img src="images/blank.gif" data-src="https://www.nhc.noaa.gov/storm_graphics/AT02/AL022024_most_likely_toa_34.png" alt="NHC Likely Arrival of Tropical Storm Force Wind" style="width:100%; max-width:650px;" class="lazyload">
                            <div>
                                <a href="https://www.nhc.noaa.gov/" target="_blank" class="w3-button w3-indigo w3-small w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                            </div>
                        </div>
                    </div>

                    <div id="Graphic6" class="w3-display-container w3-regular Graphic" style="display:none;">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkGraphic" onclick="openGraphic(event,'Graphic0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <div class="w3-alert w3-center">
                            <!-- CHANGEME: - STORM NUMBER -->
                            <img src="images/blank.gif" data-src="https://www.nhc.noaa.gov/storm_graphics/AT02/AL022024_earliest_reasonable_toa_34.png" alt="NHC Reasonable Arrival of Tropical Storm Force Winds" style="width:100%; max-width:650px;" class="lazyload">
                            <div>
                                <a href="https://www.nhc.noaa.gov/" target="_blank" class="w3-button w3-indigo w3-small w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                            </div>
                        </div>
                    </div>

                    <div id="Graphic7" class="w3-display-container w3-regular Graphic" style="display:none;">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkGraphic" onclick="openGraphic(event,'Graphic0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <div class="w3-alert w3-center">
                            <!-- CHANGEME: - STORM NUMBER -->
                            <img src="images/blank.gif" data-src="https://www.nhc.noaa.gov/storm_graphics/AT02/AL022024_wind_probs_34_F120.png" alt="NHC 5 Day Tropical Storm Wind Probability" style="width:100%; max-width:650px;" class="lazyload">
                            <div>
                                <a href="https://www.nhc.noaa.gov/" target="_blank" class="w3-button w3-indigo w3-small w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                            </div>
                        </div>
                    </div>

                    <div id="Graphic8" class="w3-display-container w3-regular Graphic" style="display:none;">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkGraphic" onclick="openGraphic(event,'Graphic0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <div class="w3-alert w3-center">
                            <!-- CHANGEME: - STORM NUMBER -->
                            <img src="images/blank.gif" data-src="https://www.nhc.noaa.gov/storm_graphics/AT02/AL022024_wind_probs_50_F120.png" alt="NHC 50 Knot Wind Probability" style="width:100%; max-width:650px;" class="lazyload">
                            <div>
                                <a href="https://www.nhc.noaa.gov/" target="_blank" class="w3-button w3-indigo w3-small w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                            </div>
                        </div>
                    </div>

                    <div id="Graphic9" class="w3-display-container w3-regular Graphic" style="display:none;">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkGraphic" onclick="openGraphic(event,'Graphic0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <div class="w3-alert w3-center">
                            <!-- CHANGEME: - STORM NUMBER -->
                            <img src="images/blank.gif" data-src="https://www.nhc.noaa.gov/storm_graphics/AT02/AL022024_wind_probs_64_F120.png" alt="NHC 64 Knot Wind Probability" style="width:100%; max-width:650px;" class="lazyload">
                            <div>
                                <a href="https://www.nhc.noaa.gov/" target="_blank" class="w3-button w3-indigo w3-small w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>

        <!-- SATELLITE - LARGE -->
        <div id="Satellite_Large" class="w3-container w3-white w3-border-2 w3-border-indigo w3-padding Storm" style="border-radius: 20px; display:none; margin-bottom: 20px;">

            <!-- FLOATERS -->
            <!-- CHANGEME: - w3-hide WHEN NO FLOATERS ARE ACTIVE  -->
            <div id="Floater_Present" class="w3-row">
                <div id="Floaters_Yes_Lg" class="w3-col w3-alert altfont" style="width:25%;">
                    <div class="w3-alert w3-bar w3-bar-block">
                        <div class="w3-alert w3-xlarge w3-padding w3-text-indigo w3-bold" style="text-decoration: underline;">FLOATER IMAGES</div>
                        <button class="w3-hide w3-bar-item tablinkSat" onclick="openSat(event,'Sat0')">&nbsp;</button>
                        <button class="w3-bar-item w3-button w3-large w3-round-large tablinkSat" onclick="openSat(event,'Sat1')">GEOCOLOR</button>
                        <button class="w3-bar-item w3-button w3-large w3-round-large tablinkSat" onclick="openSat(event,'Sat2')">BLUE VISIBLE</button>
                        <button class="w3-bar-item w3-button w3-large w3-round-large tablinkSat" onclick="openSat(event,'Sat3')">RED VISIBLE</button>
                        <button class="w3-bar-item w3-button w3-large w3-round-large tablinkSat" onclick="openSat(event,'Sat4')">SHORTWAVE IR</button>
                        <button class="w3-bar-item w3-button w3-large w3-round-large tablinkSat" onclick="openSat(event,'Sat5')">CLEAN INFRARED</button>
                        <button class="w3-bar-item w3-button w3-large w3-round-large tablinkSat" onclick="openSat(event,'Sat6')">INFRARED</button>
                        <button class="w3-bar-item w3-button w3-large w3-round-large tablinkSat" onclick="openSat(event,'Sat7')">DIRTY INFRARED</button>
                        <button class="w3-bar-item w3-button w3-large w3-round-large tablinkSat" onclick="openSat(event,'Sat8')">LOWER LEVEL WATER VAPOR</button>
                        <button class="w3-bar-item w3-button w3-large w3-round-large tablinkSat" onclick="openSat(event,'Sat9')">MID LEVEL WATER VAPOR</button>
                        <button class="w3-bar-item w3-button w3-large w3-round-large tablinkSat" onclick="openSat(event,'SAT02')">UPPER LEVEL WATER VAPOR</button>
                    </div>
                </div>

                <!-- FLOATER IMAGES -->
                <div id="Floater_Images_Yes_Lg" class="w3-col w3-alert" style="width:75%;">
                    <div class="w3-alert w3-center">


                        <div id="Sat0" class="w3-container Sat" style="padding-right: 0;">
                            <div class="w3-row">
                                <div class="w3-col" style="width: 75%;">
                                    <img src="images/blank.gif" data-src="../images/sat_card.gif" alt="Placecard" style="width:100%; max-width:400px;" class="lazyload">
                                </div>

                                <!-- EXTERNAL SAT SOURCES -->
                                <div class="w3-col" style="width: 25%;">
                                    <div id="External_Sat_Large" class="w3-col w3-alert altfont">
                                        <div class="w3-alert w3-bar w3-bar-block">
                                            <div class="w3-alert w3-xlarge w3-padding w3-bold w3-text-indigo w3-right-align" style="text-decoration: underline;">
                                                EXTERNAL WEBSITES</div>
                                            <div class="w3-bar-item w3-button w3-large w3-round-large w3-right-align">
                                                <a href="https://www.star.nesdis.noaa.gov/GOES/floater_index.php" target="_blank">NOAA TROPICAL FLOATERS</a>
                                            </div>
                                            <div class="w3-bar-item w3-button w3-large w3-round-large w3-right-align">
                                                <a href="https://www.star.nesdis.noaa.gov/GOES/" target="_blank">NOAA GOES MAIN PAGE</a>
                                            </div>
                                            <div class="w3-bar-item w3-button w3-large w3-round-large w3-right-align">
                                                <a href="https://www.tropicaltidbits.com/sat/" target="_blank">TROPICAL TIDBITS</a>
                                            </div>
                                            <div class="w3-bar-item w3-button w3-large w3-round-large w3-right-align">
                                                <a href="https://www.weathernerds.org/satellite/floaters/" target="_blank">WEATHERNERDS</a>
                                            </div>
                                            <div class="w3-bar-item w3-button w3-large w3-round-large w3-right-align">
                                                <a href="https://www.ssd.noaa.gov/PS/TROP/floaters-old.html" target="_blank">SSD OLD FLOATERS PAGE </a>
                                            </div>
                                            <div class="w3-bar-item w3-button w3-large w3-round-large w3-right-align">
                                                <a href="http://rammb.cira.colostate.edu/ramsdis/online/tropical.asp" target="_blank">RAMMB/CIRA TROPICAL</a>
                                            </div>
                                            <div class="w3-bar-item w3-button w3-large w3-round-large w3-right-align">
                                                <a href="http://tropic.ssec.wisc.edu/" target="_blank">CIMSS TROPICAL CYCLONES</a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>


                        <div id="Sat1" class="w3-display-container w3-regular Sat" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSat" onclick="openSat(event,'Sat0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <!--CHANGEME: - STORM NUMBER -->
                            <div class="w3-alert">
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/FLOATER/data/AL022024/GEOCOLOR/500x500.jpg" alt="Floater Satellite" style="width:100%; max-width:500px;" class="lazyload">
                            </div>
                            <div>
                                <!--CHANGEME: - STORM NUMBER -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/floater.php?stormid=AL022024" target="_blank" class="w3-button w3-indigo w3-regular w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST STORM FLOATER PAGE</a>
                            </div>
                        </div>

                        <div id="Sat2" class="w3-display-container w3-regular Sat" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSat" onclick="openSat(event,'Sat0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <!--CHANGEME: - STORM NUMBER -->
                            <div class="w3-alert">
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/FLOATER/data/AL022024/01/500x500.jpg" alt="Floater Satellite" style="width:100%; max-width:500px;" class="lazyload">
                            </div>
                            <div>
                                <!--CHANGEME: - STORM NUMBER -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/floater.php?stormid=AL022024" target="_blank" class="w3-button w3-indigo w3-regular w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST STORM FLOATER PAGE</a>
                            </div>
                        </div>

                        <div id="Sat3" class="w3-display-container w3-regular Sat" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSat" onclick="openSat(event,'Sat0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>


                            <!--CHANGEME: - STORM NUMBER -->
                            <div class="w3-alert">
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/FLOATER/data/AL022024/02/500x500.jpg" alt="Floater Satellite" style="width:100%; max-width:500px;" class="lazyload">
                            </div>
                            <div>
                                <!--CHANGEME: - STORM NUMBER -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/floater.php?stormid=AL022024" target="_blank" class="w3-button w3-indigo w3-regular w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST STORM FLOATER PAGE</a>
                            </div>
                        </div>

                        <div id="Sat4" class="w3-display-container w3-regular Sat" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSat" onclick="openSat(event,'Sat0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <!--CHANGEME: - STORM NUMBER -->
                            <div class="w3-alert">
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/FLOATER/data/AL022024/07/500x500.jpg" alt="Floater Satellite" style="width:100%; max-width:500px;" class="lazyload">
                            </div>
                            <div>
                                <!--CHANGEME: - STORM NUMBER -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/floater.php?stormid=AL022024" target="_blank" class="w3-button w3-indigo w3-regular w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST STORM FLOATER PAGE</a>
                            </div>
                        </div>

                        <div id="Sat5" class="w3-display-container w3-regular Sat" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSat" onclick="openSat(event,'Sat0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <!--CHANGEME: - STORM NUMBER -->
                            <div class="w3-alert">
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/FLOATER/data/AL022024/13/500x500.jpg" alt="Floater Satellite" style="width:100%; max-width:500px;" class="lazyload">
                            </div>
                            <div>
                                <!--CHANGEME: - STORM NUMBER -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/floater.php?stormid=AL022024" target="_blank" class="w3-button w3-indigo w3-regular w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST STORM FLOATER PAGE</a>
                            </div>
                        </div>

                        <div id="Sat6" class="w3-display-container w3-regular Sat" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSat" onclick="openSat(event,'Sat0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <!--CHANGEME: - STORM NUMBER -->
                            <div class="w3-alert">
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/FLOATER/data/AL022024/14/500x500.jpg" alt="Floater Satellite" style="width:100%; max-width:500px;" class="lazyload">
                            </div>
                            <div>
                                <!--CHANGEME: - STORM NUMBER -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/floater.php?stormid=AL022024" target="_blank" class="w3-button w3-indigo w3-regular w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST STORM FLOATER PAGE</a>
                            </div>
                        </div>

                        <div id="Sat7" class="w3-display-container w3-regular Sat" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSat" onclick="openSat(event,'Sat0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <!--CHANGEME: - STORM NUMBER -->
                            <div class="w3-alert">
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/FLOATER/data/AL022024/15/500x500.jpg" alt="Floater Satellite" style="width:100%; max-width:500px;" class="lazyload">
                            </div>
                            <div>
                                <!--CHANGEME: - STORM NUMBER -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/floater.php?stormid=AL022024" target="_blank" class="w3-button w3-indigo w3-regular w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST STORM FLOATER PAGE</a>
                            </div>
                        </div>

                        <div id="Sat8" class="w3-display-container w3-regular Sat" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSat" onclick="openSat(event,'Sat0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <!--CHANGEME: - STORM NUMBER -->
                            <div class="w3-alert">
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/FLOATER/data/AL022024/08/500x500.jpg" alt="Floater Satellite" style="width:100%; max-width:500px;" class="lazyload">
                            </div>
                            <div>
                                <!--CHANGEME: - STORM NUMBER -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/floater.php?stormid=AL022024" target="_blank" class="w3-button w3-indigo w3-regular w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST STORM FLOATER PAGE</a>
                            </div>
                        </div>

                        <div id="Sat9" class="w3-display-container w3-regular Sat" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSat" onclick="openSat(event,'Sat0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <!--CHANGEME: - STORM NUMBER -->
                            <div class="w3-alert">
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/FLOATER/data/AL022024/09/500x500.jpg" alt="Floater Satellite" style="width:100%; max-width:500px;" class="lazyload">
                            </div>
                            <div>
                                <!--CHANGEME: - STORM NUMBER -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/floater.php?stormid=AL022024" target="_blank" class="w3-button w3-indigo w3-regular w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST STORM FLOATER PAGE</a>
                            </div>
                        </div>

                        <div id="SAT02" class="w3-display-container w3-regular Sat" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSat" onclick="openSat(event,'Sat0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <!--CHANGEME: - STORM NUMBER -->
                            <div class="w3-alert">
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/FLOATER/data/AL022024/10/500x500.jpg" alt="Floater Satellite" style="width:100%; max-width:500px;" class="lazyload">
                            </div>
                            <div>
                                <!--CHANGEME: - STORM NUMBER -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/floater.php?stormid=AL022024" target="_blank" class="w3-button w3-indigo w3-regular w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST STORM FLOATER PAGE</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- REGIONAL SATELLITE -->
            <!-- CHANGEME: - w3-hide WHEN FLOATERS ARE ACTIVE -->
            <div id="Floaters_Absent" class="w3-hide w3-row">
                <div id="Regional_Menu_Large" class="w3-col w3-alert altfont" style="width:25%;">
                    <div class="w3-alert w3-bar w3-bar-block">
                        <div class="w3-alert w3-large w3-padding w3-text-indigo w3-bold" style="text-decoration: underline;">REGIONAL IMAGES</div>
                        <button class="w3-hide w3-bar-item tablinkSatA" onclick="openSatA(event,'SatA0A')">&nbsp;</button>
                        <button class="w3-bar-item w3-button w3-large w3-round-large tablinkSatA" onclick="openSatA(event,'SatA1A')">GEOCOLOR</button>
                        <button class="w3-bar-item w3-button w3-large w3-round-large tablinkSatA" onclick="openSatA(event,'SatA2A')">BLUE VISIBLE</button>
                        <button class="w3-bar-item w3-button w3-large w3-round-large tablinkSatA" onclick="openSatA(event,'SatA3A')">RED VISIBLE</button>
                        <button class="w3-bar-item w3-button w3-large w3-round-large tablinkSatA" onclick="openSatA(event,'SatA4A')">SHORTWAVE IR</button>
                        <button class="w3-bar-item w3-button w3-large w3-round-large tablinkSatA" onclick="openSatA(event,'SatA5A')">CLEAN INFRARED</button>
                        <button class="w3-bar-item w3-button w3-large w3-round-large tablinkSatA" onclick="openSatA(event,'SatA6A')">INFRARED</button>
                        <button class="w3-bar-item w3-button w3-large w3-round-large tablinkSatA" onclick="openSatA(event,'SatA7A')">DIRTY INFRARED</button>
                        <button class="w3-bar-item w3-button w3-large w3-round-large tablinkSatA" onclick="openSatA(event,'SatA8A')">LOWER LEVEL WATER VAPOR</button>
                        <button class="w3-bar-item w3-button w3-large w3-round-large tablinkSatA" onclick="openSatA(event,'SatA9A')">MID LEVEL WATER VAPOR</button>
                        <button class="w3-bar-item w3-button w3-large w3-round-large tablinkSatA" onclick="openSatA(event,'SatA10A')">UPPER LEVEL WATER VAPOR</button>
                    </div>
                </div>

                <!-- REGIONAL IMAGES  -->
                <div id="Regional_Images_Large" class="w3-col w3-alert" style="width:75%">
                    <div class="w3-alert w3-center">

                        <div id="SatA0A" class="w3-container SatA" style="padding-right: 0;">
                            <div class="w3-row">
                                <div class="w3-col" style="width: 75%;">
                                    <img src="images/blank.gif" data-src="../images/SatA_card.gif" alt="Placecard" style="width:100%; max-width:400px;" class="lazyload">
                                </div>
                                <div class="w3-col" style="width:25%;">
                                    <!-- EXTERNAL SAT SOURCES -->
                                    <div id="External_Sat_Websites_Large" class="w3-rest altfont">
                                        <div class="w3-alert w3-bar w3-bar-block">
                                            <div class="w3-alert w3-xlarge w3-padding w3-bold w3-text-indigo w3-right-align" style="text-decoration: underline;">
                                                EXTERNAL
                                                WEBSITES</div>
                                            <div class="w3-bar-item w3-button w3-large w3-round-large w3-right-align">
                                                <a href="https://www.star.nesdis.noaa.gov/GOES/floater_index.php" target="_blank">NOAA
                                                    TROPICAL
                                                    FLOATERS</a>
                                            </div>
                                            <div class="w3-bar-item w3-button w3-large w3-round-large w3-right-align">
                                                <a href="https://www.star.nesdis.noaa.gov/GOES/" target="_blank">NOAA
                                                    GOES
                                                    MAIN PAGE</a>
                                            </div>
                                            <div class="w3-bar-item w3-button w3-large w3-round-large w3-right-align">
                                                <a href="https://www.tropicaltidbits.com/sat/" target="_blank">TROPICAL
                                                    TIDBITS</a>
                                            </div>
                                            <div class="w3-bar-item w3-button w3-large w3-round-large w3-right-align">
                                                <a href="https://www.weathernerds.org/satellite/floaters/" target="_blank">WEATHERNERDS</a>
                                            </div>
                                            <div class="w3-bar-item w3-button w3-large w3-round-large w3-right-align">
                                                <a href="https://www.ssd.noaa.gov/PS/TROP/floaters-old.html" target="_blank">SSD OLD
                                                    FLOATERS PAGE </a>
                                            </div>
                                            <div class="w3-bar-item w3-button w3-large w3-round-large w3-right-align">
                                                <a href="http://rammb.cira.colostate.edu/ramsdis/online/tropical.asp" target="_blank">RAMMB/CIRA
                                                    TROPICAL</a>
                                            </div>
                                            <div class="w3-bar-item w3-button w3-large w3-round-large w3-right-align">
                                                <a href="http://tropic.ssec.wisc.edu/" target="_blank">CIMSS TROPICAL
                                                    CYCLONES</a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div id="SatA1A" class="w3-display-container w3-regular SatA" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSatA" onclick="openSatA(event,'SatA0A')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <!--CHANGEME: REGIONAL LOCATION -->
                            <div class="w3-alert">
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/taw/GEOCOLOR/1800x1080.jpg" alt="Regional Satellite" style="width:100%; max-width:800px;" class="lazyload">
                            </div>
                            <div>
                                <!--CHANGEME: REGIONAL LOCATION -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/sector.php?sat=G16&sector=taw" target="_blank" class="w3-button w3-indigo w3-regular w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!--CHANGEME: REGIONAL LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST
                                    WESTERN ATLANTIC SATELLITE PAGE
                                </a>
                            </div>

                        </div>

                        <div id="SatA2A" class="w3-display-container w3-regular SatA" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSatA" onclick="openSatA(event,'SatA0A')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <!--CHANGEME: REGIONAL LOCATION -->
                            <div class="w3-alert">
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/taw/01/1800x1080.jpg" alt="Regional Satellite" style="width:100%; max-width:800px;" class="lazyload">
                            </div>
                            <div>
                                <!--CHANGEME: REGIONAL LOCATION -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/sector.php?sat=G16&sector=taw" target="_blank" class="w3-button w3-indigo w3-regular w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!--CHANGEME: REGIONAL LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST
                                    WESTERN ATLANTIC SATELLITE PAGE
                                </a>
                            </div>

                        </div>

                        <div id="SatA3A" class="w3-display-container w3-regular SatA" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSatA" onclick="openSatA(event,'SatA0A')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>
                            <!--CHANGEME: REGIONAL LOCATION -->
                            <div class="w3-alert">
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/taw/02/1800x1080.jpg" alt="Regional Satellite" style="width:100%; max-width:800px;" class="lazyload">
                            </div>
                            <div>
                                <!--CHANGEME: REGIONAL LOCATION -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/sector.php?sat=G16&sector=taw" target="_blank" class="w3-button w3-indigo w3-regular w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!--CHANGEME: REGIONAL LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST
                                    WESTERN ATLANTIC SATELLITE PAGE
                                </a>
                            </div>
                        </div>

                        <div id="SatA4A" class="w3-display-container w3-regular SatA" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSatA" onclick="openSatA(event,'SatA0A')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <!--CHANGEME: REGIONAL LOCATION -->
                            <div class="w3-alert">
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/taw/07/1800x1080.jpg" alt="Regional Satellite" style="width:100%; max-width:800px;" class="lazyload">
                            </div>
                            <div>
                                <!--CHANGEME: REGIONAL LOCATION -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/sector.php?sat=G16&sector=taw" target="_blank" class="w3-button w3-indigo w3-regular w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!--CHANGEME: REGIONAL LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST
                                    WESTERN ATLANTIC SATELLITE PAGE
                                </a>
                            </div>
                        </div>

                        <div id="SatA5A" class="w3-display-container w3-regular SatA" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSatA" onclick="openSatA(event,'SatA0A')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <!--CHANGEME: REGIONAL LOCATION -->
                            <div class="w3-alert">
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/taw/13/1800x1080.jpg" alt="Regional Satellite" style="width:100%; max-width:800px;" class="lazyload">
                            </div>
                            <div>
                                <!--CHANGEME: REGIONAL LOCATION -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/sector.php?sat=G16&sector=taw" target="_blank" class="w3-button w3-indigo w3-regular w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!--CHANGEME: REGIONAL LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST
                                    WESTERN ATLANTIC SATELLITE PAGE
                                </a>
                            </div>
                        </div>

                        <div id="SatA6A" class="w3-display-container w3-regular SatA" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSatA" onclick="openSatA(event,'SatA0A')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <!--CHANGEME: REGIONAL LOCATION -->
                            <div class="w3-alert">
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/taw/14/1800x1080.jpg" alt="Regional Satellite" style="width:100%; max-width:800px;" class="lazyload">
                            </div>
                            <div>
                                <!--CHANGEME: REGIONAL LOCATION -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/sector.php?sat=G16&sector=taw" target="_blank" class="w3-button w3-indigo w3-regular w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!--CHANGEME: REGIONAL LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST
                                    WESTERN ATLANTIC SATELLITE PAGE
                                </a>
                            </div>
                        </div>

                        <div id="SatA7A" class="w3-display-container w3-regular SatA" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSatA" onclick="openSatA(event,'SatA0A')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <!--CHANGEME: REGIONAL LOCATION -->
                            <div class="w3-alert">
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/taw/15/1800x1080.jpg" alt="Regional Satellite" style="width:100%; max-width:800px;" class="lazyload">
                            </div>
                            <div>
                                <!--CHANGEME: REGIONAL LOCATION -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/sector.php?sat=G16&sector=taw" target="_blank" class="w3-button w3-indigo w3-regular w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!--CHANGEME: REGIONAL LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST
                                    WESTERN ATLANTIC SATELLITE PAGE
                                </a>
                            </div>
                        </div>

                        <div id="SatA8A" class="w3-display-container w3-regular SatA" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSatA" onclick="openSatA(event,'SatA0A')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <!--CHANGEME: REGIONAL LOCATION -->
                            <div class="w3-alert">
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/taw/08/1800x1080.jpg" alt="Regional Satellite" style="width:100%; max-width:800px;" class="lazyload">
                            </div>
                            <div>
                                <!--CHANGEME: REGIONAL LOCATION -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/sector.php?sat=G16&sector=taw" target="_blank" class="w3-button w3-indigo w3-regular w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!--CHANGEME: REGIONAL LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST
                                    WESTERN ATLANTIC SATELLITE PAGE
                                </a>
                            </div>
                        </div>

                        <div id="SatA9A" class="w3-display-container w3-regular SatA" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSatA" onclick="openSatA(event,'SatA0A')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <!--CHANGEME: REGIONAL LOCATION -->
                            <div class="w3-alert">
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/taw/09/1800x1080.jpg" alt="Regional Satellite" style="width:100%; max-width:800px;" class="lazyload">
                            </div>
                            <div>
                                <!--CHANGEME: REGIONAL LOCATION -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/sector.php?sat=G16&sector=taw" target="_blank" class="w3-button w3-indigo w3-regular w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!--CHANGEME: REGIONAL LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST
                                    WESTERN ATLANTIC SATELLITE PAGE
                                </a>
                            </div>
                        </div>

                        <div id="SatA10A" class="w3-display-container w3-regular SatA" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSatA" onclick="openSatA(event,'SatA0A')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <!--CHANGEME: REGIONAL LOCATION -->
                            <div class="w3-alert">
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/taw/10/1800x1080.jpg" alt="Regional Satellite" style="width:100%; max-width:800px;" class="lazyload">
                            </div>
                            <div>
                                <!--CHANGEME: REGIONAL LOCATION -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/sector.php?sat=G16&sector=taw" target="_blank" class="w3-button w3-indigo w3-regular w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!--CHANGEME: REGIONAL LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST
                                    WESTERN ATLANTIC SATELLITE PAGE
                                </a>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>

        <!-- LOCAL_IMPACTS: -->
        <!-- RADARS - LARGE -->
        <div id="Radars_Large" class="w3-container w3-white w3-border-2 w3-border-indigo w3-padding Storm" style="border-radius: 20px; display:none; margin-bottom: 20px;">

            <div class="w3-row">
                <div class="w3-col w3-left w3-alert altfont" style="width:25%;">
                    <div class="w3-alert w3-bar w3-bar-block">
                        <button class="w3-bar-item w3-hide tablinkRad" onclick="openRad(event,'Rad0')">&nbsp;</button>

                        <!-- RADAR SITE 1 -->
                        <div id="Radar_Site_1_Lg" class="w3-bottombar">
                            <div class=" w3-alert w3-xlarge w3-padding w3-text-indigo w3-bold" style="text-decoration: underline;">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                DOVER, DE
                            </div>
                            <button class="w3-bar-item w3-button w3-large w3-round-large tablinkRad" onclick="openRad(event,'Rad1')">SHORT RANGE IMAGE</button>
                            <button class="w3-bar-item w3-button w3-large w3-round-large tablinkRad" onclick="openRad(event,'Rad2')">SHORT RANGE LOOP</button>
                            <button class="w3-bar-item w3-button w3-large w3-round-large tablinkRad" onclick="openRad(event,'Rad3')">LONG RANGE</button>
                            <button class="w3-bar-item w3-button w3-large w3-round-large tablinkRad" onclick="openRad(event,'Rad4')">LONG RANGE LOOP</button>
                        </div>

                        <!-- RADAR SITE 2 -->
                        <!-- CHANGEME: - w3-hide WHEN NOT IN USE -->
                        <div id="Radar_Site_2_Lg" class="">
                            <div class="w3-alert w3-xlarge w3-padding w3-text-indigo w3-bold" style="text-decoration: underline;">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                MT HOLLY, NJ
                            </div>
                            <button class="w3-bar-item w3-button w3-large w3-round-large tablinkRad" onclick="openRad(event,'Rad5')">SHORT RANGE IMAGE</button>
                            <button class="w3-bar-item w3-button w3-large w3-round-large tablinkRad" onclick="openRad(event,'Rad6')">SHORT RANGE LOOP</button>
                            <button class="w3-bar-item w3-button w3-large w3-round-large tablinkRad" onclick="openRad(event,'Rad7')">LONG RANGE</button>
                            <button class="w3-bar-item w3-button w3-large w3-round-large tablinkRad" onclick="openRad(event,'Rad8')">LONG RANGE LOOP</button>
                        </div>

                    </div>
                </div>

                <div class="w3-col w3-right w3-alert altfont" style="width:25%">
                    <div class="w3-alert w3-bar w3-bar-block">

                        <!-- RADAR SITE 3 -->
                        <!-- CHANGEME:  - w3-hide WHEN NOT IN USE -->
                        <div id="Radar_Site_3_Lg" class="w3-bottombar">
                            <div class="w3-alert w3-xlarge w3-padding w3-padding w3-right-align w3-text-indigo w3-bold" style="text-decoration: underline;">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                UPTON, NY
                            </div>
                            <button class="w3-bar-item w3-button w3-large w3-round-large w3-right-align tablinkRad" onclick="openRad(event,'Rad9')">SHORT RANGE IMAGE</button>
                            <button class="w3-bar-item w3-button w3-large w3-round-large w3-right-align tablinkRad" onclick="openRad(event,'Rad10')">SHORT RANGE LOOP</button>
                            <button class="w3-bar-item w3-button w3-large w3-round-large w3-right-align tablinkRad" onclick="openRad(event,'Rad11')">LONG RANGE</button>
                            <button class="w3-bar-item w3-button w3-large w3-round-large w3-right-align tablinkRad" onclick="openRad(event,'Rad12')">LONG RANGE LOOP</button>
                        </div>

                        <!-- RADAR SITE 4 -->
                        <!-- CHANGEME: - w3-hide WHEN NOT IN USE -->
                        <div id="Radar_Site_4_Lg" class="">
                            <div class="w3-alert w3-xlarge w3-padding w3-padding w3-right-align w3-text-indigo w3-bold" style="text-decoration: underline;">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                BOSTON, MA
                            </div>
                            <button class="w3-bar-item w3-button w3-large w3-round-large w3-right-align tablinkRad" onclick="openRad(event,'Rad13')">SHORT RANGE IMAGE</button>
                            <button class="w3-bar-item w3-button w3-large w3-round-large w3-right-align tablinkRad" onclick="openRad(event,'Rad14')">SHORT RANGE LOOP</button>
                            <button class="w3-bar-item w3-button w3-large w3-round-large w3-right-align tablinkRad" onclick="openRad(event,'Rad15')">LONG RANGE</button>
                            <button class="w3-bar-item w3-button w3-large w3-round-large w3-right-align tablinkRad" onclick="openRad(event,'Rad16')">LONG RANGE LOOP</button>
                        </div>
                    </div>
                </div>

                <div class="w3-rest w3-center w3-alert">

                    <!-- COMPOSITE RADARS -->
                    <!-- CHANGEME: - w3-hide REGIONAL RADAR WHEN NOT IN RANGE -->
                    <div id="Rad0" class="w3-container Rad">

                        <!-- CHANGEME: - w3-hide BASED ON LOCATION  -->
                        <div id="Northeast_Comp_Lg" class="w3-center">
                            <div class="w3-container w3-large w3-padding w3-padding w3-text-indigo w3-bold altfont">
                                NORTHEAST COMPOSITE LOOP
                            </div>
                            <div>
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/Conus/Loop/northeast_loop.gif" alt="Regional Radar Loop" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                        </div>

                        <!-- CHANGEME: - w3-hide BASED ON LOCATION  -->
                        <div id="Southeast_Comp_Lg" class="w3-hide w3-center">
                            <div class="w3-container w3-large w3-padding w3-text-indigo w3-bold altfont">
                                SOUTHEAST COMPOSITE LOOP
                            </div>
                            <div>
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/Conus/Loop/southeast_loop.gif" alt="Regional Radar Loop" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                        </div>

                        <!-- CHANGEME: - w3-hide BASED ON LOCATION  -->
                        <div id="Gulf_Comp_Lg" class="w3-hide w3-center">
                            <div class="w3-container w3-large w3-padding w3-padding w3-text-indigo w3-bold altfont">
                                CENTRAL GULF COMPOSITE LOOP
                            </div>
                            <div>
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/Conus/Loop/southmissvly_loop.gif" alt="Regional Radar Loop" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                        </div>

                        <!-- CHANGEME: - w3-hide BASED ON LOCATION  -->
                        <div id="Texas_Comp_Lg" class="w3-hide w3-center">
                            <div class="w3-container w3-large w3-padding w3-padding w3-text-indigo w3-bold altfont">
                                WESTERN GULF COMPOSITE LOOP
                            </div>
                            <div>
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/Conus/Loop/southplains_loop.gif" alt="Regional Radar Loop" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                        </div>
                        <div class="w3-alert">
                            <a href="https://radar.weather.gov" target="_blank" class="w3-button w3-indigo w3-small w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NWS MAIN RADAR PAGE</a>
                        </div>
                    </div>

                    <!-- RADAR SITE 1 IMAGES -->
                    <div id="Radar_Images_1_Lg">
                        <div id="Rad1" class="w3-display-container Rad" style="display:none">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRad" onclick="openRad(event,'Rad0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>
                            <div class="w3-container">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/standard/N0R/DOX_0.png" alt="Local Radar" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                            <div class="w3-alert">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <a href="https://radar.weather.gov/ridge/radar.php?rid=dox" target="_blank" class="w3-button w3-indigo w3-small w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!--CHANGEME: RADAR LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;DOVER NWS RADAR PAGE
                                </a>
                            </div>
                        </div>
                        <div id="Rad2" class="w3-display-container Rad" style="display:none">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRad" onclick="openRad(event,'Rad0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>
                            <div class="w3-container">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/standard/N0R/DOX_loop.gif" alt="Local Radar Loop" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                            <div class="w3-alert">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <a href="https://radar.weather.gov/ridge/radar.php?rid=dox" target="_blank" class="w3-button w3-indigo w3-small w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!--CHANGEME: RADAR LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;DOVER NWS RADAR PAGE
                                </a>
                            </div>
                        </div>
                        <div id="Rad3" class="w3-display-container Rad" style="display:none">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRad" onclick="openRad(event,'Rad0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>
                            <div class="w3-container">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/standard/N0Z/DOX_0.png" alt="Local Radar" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                            <div class="w3-alert">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <a href="https://radar.weather.gov/ridge/radar.php?rid=dox" target="_blank" class="w3-button w3-indigo w3-small w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!--CHANGEME: RADAR LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;DOVER NWS RADAR PAGE
                                </a>
                            </div>
                        </div>
                        <div id="Rad4" class="w3-display-container Rad" style="display:none">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRad" onclick="openRad(event,'Rad0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>
                            <div class="w3-container">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/standard/N0Z/DOX_loop.gif" alt="Local Radar Loop" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                            <div class="w3-alert">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <a href="https://radar.weather.gov/ridge/radar.php?rid=dox" target="_blank" class="w3-button w3-indigo w3-small w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!--CHANGEME: RADAR LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;DOVER NWS RADAR PAGE
                                </a>
                            </div>
                        </div>
                    </div>

                    <!-- RADAR SITE 2 IMAGES -->
                    <div id="Radar_Images_2_Lg">
                        <div id="Rad5" class="w3-display-container Rad" style="display:none">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRad" onclick="openRad(event,'Rad0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>
                            <div class="w3-container">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/standard/N0R/DIX_0.png" alt="Local Radar" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                            <div class="w3-alert">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <a href="https://radar.weather.gov/ridge/radar.php?rid=dix" target="_blank" class="w3-button w3-indigo w3-small w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!--CHANGEME: RADAR LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;MT HOLLY
                                    NWS RADAR PAGE
                                </a>
                            </div>
                        </div>
                        <div id="Rad6" class="w3-display-container Rad" style="display:none">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRad" onclick="openRad(event,'Rad0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>
                            <div class="w3-container">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/standard/N0R/DIX_loop.gif" alt="Local Radar Loop" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                            <div class="w3-alert">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <a href="https://radar.weather.gov/ridge/radar.php?rid=dix" target="_blank" class="w3-button w3-indigo w3-small w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!--CHANGEME: RADAR LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;MT HOLLY
                                    NWS RADAR PAGE
                                </a>
                            </div>
                        </div>
                        <div id="Rad7" class="w3-display-container Rad" style="display:none">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRad" onclick="openRad(event,'Rad0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>
                            <div class="w3-container">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/standard/N0Z/DIX_0.png" alt="Local Radar" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                            <div class="w3-alert">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <a href="https://radar.weather.gov/ridge/radar.php?rid=dix" target="_blank" class="w3-button w3-indigo w3-small w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!--CHANGEME: RADAR LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;MT HOLLY
                                    NWS RADAR PAGE
                                </a>
                            </div>
                        </div>
                        <div id="Rad8" class="w3-display-container Rad" style="display:none">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRad" onclick="openRad(event,'Rad0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>
                            <div class="w3-container">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/standard/N0Z/DIX_loop.gif" alt="Local Radar Loop" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                            <div class="w3-alert">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <a href="https://radar.weather.gov/ridge/radar.php?rid=dix" target="_blank" class="w3-button w3-indigo w3-small w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!--CHANGEME: RADAR LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;MT HOLLY
                                    NWS RADAR PAGE
                                </a>
                            </div>
                        </div>
                    </div>

                    <!-- RADAR SITE 3 IMAGES -->
                    <div id="Radar_Images_3_Lg" class="">
                        <div id="Rad9" class="w3-display-container Rad" style="display:none">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRad" onclick="openRad(event,'Rad0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>
                            <div class="w3-container">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/standard/N0R/OKX_0.png" alt="Local Radar" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                            <div class="w3-alert">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <a href="https://radar.weather.gov/ridge/radar.php?rid=okx" target="_blank" class="w3-button w3-indigo w3-small w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!-- CHANGEME: RADAR LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;UPTON
                                    NWS RADAR PAGE
                                </a>
                            </div>
                        </div>
                        <div id="Rad10" class="w3-display-container Rad" style="display:none">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRad" onclick="openRad(event,'Rad0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>
                            <div class="w3-container">
                                <!--CHANGEME: - RADAR LOCATION -->
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/standard/N0R/OKX_loop.gif" alt="Local Radar Loop" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                            <div class="w3-alert">
                                <!--CHANGEME: - RADAR LOCATION -->
                                <a href="https://radar.weather.gov/ridge/radar.php?rid=okx" target="_blank" class="w3-button w3-indigo w3-small w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!--CHANGEME: RADAR LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;UPTON
                                    NWS RADAR PAGE
                                </a>
                            </div>
                        </div>
                        <div id="Rad11" class="w3-display-container Rad" style="display:none">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRad" onclick="openRad(event,'Rad0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>
                            <div class="w3-container">
                                <!--CHANGEME: - RADAR LOCATION -->
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/standard/N0Z/OKX_0.png" alt="Local Radar" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                            <div class="w3-alert">
                                <!--CHANGEME: RADAR LOCATION -->
                                <a href="https://radar.weather.gov/ridge/radar.php?rid=okx" target="_blank" class="w3-button w3-indigo w3-small w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!--CHANGEME: RADAR LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;UPTON
                                    NWS RADAR PAGE
                                </a>
                            </div>
                        </div>
                        <div id="Rad12" class="w3-display-container Rad" style="display:none">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRad" onclick="openRad(event,'Rad0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>
                            <div class="w3-container">
                                <!--CHANGEME: - RADAR LOCATION -->
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/standard/N0Z/OKX_loop.gif" alt="Local Radar Loop" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                            <div class="w3-alert">
                                <!--CHANGEME: - RADAR LOCATION -->
                                <a href="https://radar.weather.gov/ridge/radar.php?rid=okx" target="_blank" class="w3-button w3-indigo w3-small w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!--CHANGEME: RADAR LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;UPTON
                                    NWS RADAR PAGE
                                </a>
                            </div>
                        </div>
                    </div>

                    <!-- RADAR IMAGES 4 -->
                    <div id="Radar_Images_4_Lg" class="">
                        <div id="Rad13" class="w3-display-container Rad" style="display:none">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRad" onclick="openRad(event,'Rad0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>
                            <div class="w3-container">
                                <!--CHANGEME: - RADAR LOCATION -->
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/standard/N0R/BOX_0.png" alt="Local Radar" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                            <div class="w3-alert">
                                <!--CHANGEME: - RADAR LOCATION -->
                                <a href="https://radar.weather.gov/ridge/radar.php?rid=box" target="_blank" class="w3-button w3-indigo w3-small w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!--CHANGEME: RADAR LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;BOSTON
                                    NWS RADAR PAGE
                                </a>
                            </div>
                        </div>
                        <div id="Rad14" class="w3-display-container Rad" style="display:none">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRad" onclick="openRad(event,'Rad0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>
                            <div class="w3-container">
                                <!--CHANGEME: - RADAR LOCATION -->
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/standard/N0R/BOX_loop.gif" alt="Local Radar Loop" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                            <div class="w3-alert">
                                <!--CHANGEME: - RADAR LOCATION -->
                                <a href="https://radar.weather.gov/ridge/radar.php?rid=box" target="_blank" class="w3-button w3-indigo w3-small w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!--CHANGEME: RADAR LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;BOSTON
                                    NWS RADAR PAGE
                                </a>
                            </div>
                        </div>
                        <div id="Rad15" class="w3-display-container Rad" style="display:none">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRad" onclick="openRad(event,'Rad0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>
                            <div class="w3-container">
                                <!--CHANGEME: - RADAR LOCATION -->
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/standard/N0Z/BOX_0.png" alt="Local Radar" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                            <div class="w3-alert">
                                <!--CHANGEME: - RADAR LOCATION -->
                                <a href="https://radar.weather.gov/ridge/radar.php?rid=box" target="_blank" class="w3-button w3-indigo w3-small w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!--CHANGEME: RADAR LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;BOSTON
                                    NWS RADAR PAGE
                                </a>
                            </div>
                        </div>
                        <div id="Rad16" class="w3-display-container Rad" style="display:none">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRad" onclick="openRad(event,'Rad0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>
                            <div class="w3-container">
                                <!--CHANGEME: - RADAR LOCATION -->
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/standard/N0Z/BOX_loop.gif" alt="Local Radar Loop" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                            <div class="w3-alert">
                                <!--CHANGEME: RADAR LOCATION -->
                                <a href="https://radar.weather.gov/ridge/radar.php?rid=box" target="_blank" class="w3-button w3-indigo w3-small w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!--CHANGEME: RADAR LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;BOSTON
                                    NWS RADAR PAGE
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>

        <!-- LOCAL_IMPACTS: -->
        <!-- LOCAL - LARGE -->
        <div id="Local_Large" class="w3-container w3-white w3-border-2 w3-border-indigo w3-padding Storm" style="border-radius: 20px; display:none; margin-bottom: 20px;">

            <div class="w3-row">
                <div class="w3-col w3-left w3-alert altfont" style="width:25%;">
                    <div class="w3-alert w3-bar w3-bar-block altfont">
                        <div class="w3-alert w3-xlarge w3-padding w3-padding w3-text-indigo w3-bold" style="text-decoration: underline;">IMPACT GRAPHICS
                        </div>
                        <button class="w3-hide tablinkLocal" onclick="openLocal(event,'Local0')">&nbsp;</button>
                        <button class="w3-bar-item w3-button w3-large w3-round-large tablinkLocal" onclick="openLocal(event,'Local1')">KEY
                            MESSAGES</button>
                        <button class="w3-bar-item w3-button w3-large w3-round-large tablinkLocal" onclick="openLocal(event,'Local2')">MENSAJES CLAVE</button>
                        <button class="w3-bar-item w3-button w3-large w3-round-large tablinkLocal" onclick="openLocal(event,'Local3')">RAINFALL
                            POTENTIAL</button>

                        <button class="w3-bar-item w3-button w3-large w3-round-large tablinkLocal" onclick="openLocal(event,'Local4')">DAY ONE EXCESSIVE
                            RAINFALL</button>
                        <button class="w3-bar-item w3-button w3-large w3-round-large tablinkLocal" onclick="openLocal(event,'Local5')">DAY TWO EXCESSIVE
                            RAINFALL</button>
                        <button class="w3-bar-item w3-button w3-large w3-round-large tablinkLocal" onclick="openLocal(event,'Local6')">DAY THREE EXCESSIVE
                            RAINFALL</button>

                        <!-- CHANGEME: - STORM NUMBER -->
                        <a href="https://www.nhc.noaa.gov/refresh/graphics_at2+shtml/025509.shtml?inundation#contents" target="_blank" class="w3-bar-item w3-button w3-large w3-round-large">POTENTIAL STORM SURGE FLOODING</a>

                        <!-- CHANGEME: - STORM NUMBER -->
                        <a href="https://www.nhc.noaa.gov/refresh/graphics_at2+shtml/025509.shtml?wsurge#contents" target="_blank" class="w3-bar-item w3-button w3-large w3-round-large">STORM SURGE WATCHES &amp; WARNINGS</a>
                    </div>
                </div>

                <div class="w3-col w3-right w3-alert altfont" style="width:25%">
                    <div class="w3-alert w3-bar w3-bar-block">
                        <div class="w3-alert w3-right-align w3-xlarge w3-padding w3-padding w3-text-indigo w3-bold" style="text-decoration: underline;">LOCAL NWS OFFICES
                        </div>

                        <!-- OFFICE #1: -->
                        <div class="w3-alert w3-right-align w3-bottombar">
                            <div class="w3-bar-item w3-button w3-bold w3-right-align w3-large w3-round-large">
                                <!--CHANGEME: NWS LOCATION -->
                                <a href="https://www.weather.gov/phi" target="_blank">PHILADELPHIA, PA</a>
                            </div>
                            <div class="w3-bar-item w3-button w3-right-align w3-large w3-round-large">
                                <!--CHANGEME: NWS LOCATION -->
                                <a href="https://www.weather.gov/phi/tropical" target="_blank">LOCAL IMPACTS PAGE</a>
                            </div>
                        </div>

                        <!-- CHANGEME: OFFICE #2 - w3-hide WHEN NOT IN USE -->
                        <div class="w3-alert w3-bottombar">
                            <div class="w3-bar-item w3-button w3-bold w3-right-align w3-large w3-round-large">
                                <!--CHANGEME: NWS LOCATION -->
                                <a href="https://www.weather.gov/okx" target="_blank">NEW YORK</a>
                            </div>
                            <div class="w3-bar-item w3-button w3-right-align w3-large w3-round-large">
                                <!--CHANGEME: NWS LOCATION -->
                                <a href="https://www.weather.gov/okx/tropical" target="_blank">LOCAL IMPACTS PAGE</a>
                            </div>
                        </div>

                        <!-- CHANGEME: OFFICE #3 - w3-hide WHEN NOT IN USE  -->
                        <div class="w3-alert w3-bottombar w3-hide">
                            <div class="w3-bar-item w3-button w3-bold w3-right-align w3-large w3-round-large">
                                <!--CHANGEME: NWS LOCATION -->
                                <a href="https://www.weather.gov/mfl" target="_blank">WAKEFIELD</a>
                            </div>
                            <div class="w3-bar-item w3-button w3-right-align w3-large w3-round-large">
                                <!--CHANGEME: NWS LOCATION -->
                                <a href="https://www.weather.gov/srh/tropical?office=mfl" target="_blank">LOCAL IMPACTS PAGE</a>
                            </div>
                        </div>

                        <!-- CHANGEME: OFFICE #4 - w3-hide WHEN NOT IN USE  -->
                        <div class="w3-alert w3-hide">
                            <div class="w3-bar-item w3-button w3-bold w3-right-align w3-large w3-round-large">
                                <!--CHANGEME: NWS LOCATION -->
                                <a href="https://www.weather.gov/tbw" target="_blank">RALEIGH</a>
                            </div>
                            <div class="w3-bar-item w3-button w3-right-align w3-large w3-round-large">
                                <!--CHANGEME: NWS LOCATION -->
                                <a href="https://www.weather.gov/srh/tropical?office=tbw" target="_blank">LOCAL IMPACTS PAGE</a>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="w3-rest w3-center w3-alert">
                    <div id="Local0" class="w3-container Local">
                        <img src="images/blank.gif" data-src="../images/sat_card.gif" alt="Placecard" style="width:100%; max-width:400px;" class="lazyload">
                    </div>

                    <div id="Local1" class="w3-display-container Local" style="display:none">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkLocal" onclick="openLocal(event,'Local0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>
                        <div class="w3-alert">
                            <img src="images/blank.gif" data-src="https://www.nhc.noaa.gov/storm_graphics/AT02/AL022024_key_messages.png" alt="NHC Key Messages" style="width:100%; max-width:600px;" class=" lazyload">
                        </div>
                        <div>
                            <a href="https://www.nhc.noaa.gov" target="_blank" class="w3-button w3-indigo w3-regular w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                        </div>
                    </div>

                    <div id="Local2" class="w3-display-container Local" style="display:none">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkLocal" onclick="openLocal(event,'Local0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <!-- CHANGEME: - STORM NUMBER -->
                        <div class="w3-alert">
                            <img src="images/blank.gif" data-src="https://www.nhc.noaa.gov/storm_graphics/AT02/AL022024_spanish_key_messages.png" alt="NHC Key Message Espanol" style="width:100%; max-width:600px;" class=" lazyload">
                        </div>
                        <div>
                            <a href="https://www.nhc.noaa.gov" target="_blank" class="w3-button w3-indigo w3-regular w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                        </div>
                    </div>

                    <div id="Local3" class="w3-display-container Local" style="display:none">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkLocal" onclick="openLocal(event,'Local0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <!-- CHANGEME: - STORM NUMBER -->
                        <div class="w3-alert">
                            <img src="images/blank.gif" data-src="https://www.nhc.noaa.gov/storm_graphics/AT02/AL0220WPCQPF.gif" alt="NHC Expected Rainfall" style="width:100%; max-width:600px;" class=" lazyload">
                        </div>
                        <div>
                            <a href="https://www.nhc.noaa.gov" target="_blank" class="w3-button w3-indigo w3-regular w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                        </div>
                    </div>

                    <div id="Local4" class="w3-display-container Local" style="display:none">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkLocal" onclick="openLocal(event,'Local0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <img src="images/blank.gif" data-src="https://www.wpc.ncep.noaa.gov/qpf/94ewbg.gif" alt="WPC Day 1 Excessive Rainfall" style="width:100%; max-width:600px;" class="lazyload">
                        <div>
                            <a href="https://www.wpc.ncep.gov" target="_blank" class="w3-button w3-indigo w3-regular w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;WEATHER PREDICTION CENTER</a>
                        </div>
                    </div>

                    <div id="Local5" class="w3-display-container Local" style="display:none">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkLocal" onclick="openLocal(event,'Local0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <img src="images/blank.gif" data-src="https://www.wpc.ncep.noaa.gov/qpf/98ewbg.gif" alt="WPC Day 2 Excessive Rainfall" style="width:100%; max-width:600px;" class="lazyload">
                        <div>
                            <a href="https://www.wpc.ncep.gov" target="_blank" class="w3-button w3-indigo w3-regular w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;WEATHER PREDICTION CENTER</a>
                        </div>
                    </div>

                    <div id="Local6" class="w3-display-container Local" style="display:none">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkLocal" onclick="openLocal(event,'Local0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>
                        <img src="images/blank.gif" data-src="https://www.wpc.ncep.noaa.gov/qpf/99ewbg.gif" alt="WPC Day 3 Excessive Rainfall" style="width:100%; max-width:600px;" class="lazyload">
                        <div>
                            <a href="https://www.wpc.ncep.gov" target="_blank" class="w3-button w3-indigo w3-regular w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;WEATHER PREDICTION CENTER</a>
                        </div>
                    </div>


                </div>
            </div>

        </div>

        <!-- Copyright and Social Media - LARGE -->
        <div id="Copyright_Large" class=" w3-container w3-padding w3-center" style="margin-bottom:5px;">
            <div class="w3-alert">
                <a href="https://www.facebook.com/nchurricane" target="_blank">
                    <img src="images/blank.gif" data-src="../images/fb.png" alt="Facebook" class="w3-image lazyload" style="max-width:50px; text-decoration: none">
                </a>
                <a href="https://twitter.com/chuckcopelandwx" target="_blank">
                    <img src="images/blank.gif" data-src="../images/tw.png" alt="Twitter" class="w3-image lazyload" style="max-width:50px; text-decoration: none">
                </a>
                <a href="https://www.instagram.com/chuck_copeland_wx/" target="_blank">
                    <img src="images/blank.gif" data-src="../images/ig.png" alt="Instagram" class="w3-image lazyload" style="max-width:50px; text-decoration: none">
                </a>
                <a href="https://www.youtube.com/@nchurricane" target="_blank">
                    <img src="images/blank.gif" data-src="../images/yt.png" alt="YouTube" class="w3-image lazyload" style="max-width:50px; text-decoration: none">
                </a>
                <a href="mailto:admin@nchurricane.com">
                    <img src="images/blank.gif" data-src="../images/email.png" alt="EMail" class="w3-image lazyload" style="max-width:50px; text-decoration: none">
                </a>
            </div>
            <div class="w3-container w3-padding" style="margin-bottom:5px; margin-top: 10px;">
                <div class="w3-alert w3-small w3-center">
                    NCHurricane.com is for informative purposes only. Do not use the
                    information on this site to make decisions regarding protecting your
                    life and⁄or personal property. Rely only on information from official
                    sources of information, such as your local NWS office, the NHC, and
                    your local AMS certified meteorologists to make such decisions in a
                    severe weather event.
                </div>
            </div>
            <div class="w3-container w3-padding" style="padding-bottom:5px;">
                <div class="w3-alert w3-tiny w3-center">
                    Copyright &copy;>2003, 2024 NCHurricane. Website design by Chuck
                    Copeland.
                </div>
            </div>
        </div>
    </div>

    <!-- MEDIUM CONTENT -->
    <!-- ADJUST FOR MEDIUM SCREENS -->
    <div id="Medium_Content" class="mainbox w3-hide-small w3-hide-large" style="margin-top:10px;">

        <!-- SYSTEM NAME - MEDIUM -->
        <div class="w3-container w3-xxlarge w3-center w3-bold w3-text-indigo altfont" style="margin-bottom:10px;">
            <!-- CHANGEME: - STORM NUMBER  -->
            <?php
            $system02 = simplexml_load_file("../xml/02L.xml");
            echo $system02->systemType;
            echo str_repeat("&nbsp;", 1);
            echo $system02->systemName;
            ?>
        </div>

        <!-- INFORMATION MENU - MEDIUM -->
        <div class="w3-container">
            <div class="w3-bar altfont">
                <div id="Info_Menu_Medium">
                    <button class="w3-bar-item w3-button w3-border w3-regular w3-border-black tablinkStormMd" onclick="openStormMd(event,'CurrentMd')" style="border-top-left-radius: 20px; border-top-right-radius: 20px; margin-right: 2px; background: #2600ff; color: #ffffff;">
                        <!-- CHANGEME:- STORM NUMBER -->
                        <?php echo substr($system02->messageDateTimeLocal, 9);
                        ?>
                    </button>
                    <button class="w3-bar-item w3-button w3-border w3-regular w3-border-black tablinkStormMd" onclick="openStormMd(event,'NHCTextMd')" style="border-top-left-radius: 20px; border-top-right-radius: 20px; margin-right: 2px; background: #ffffff;">TEXT
                        PRODUCTS
                    </button>
                    <button class="w3-bar-item w3-button w3-border w3-regular w3-border-black tablinkStormMd" onclick="openStormMd(event,'GraphicsMd')" style="border-top-left-radius: 20px; border-top-right-radius: 20px; margin-right: 2px; background: #ffffff;">GRAPHICS
                    </button>
                    <button class="w3-bar-item w3-button w3-border w3-regular w3-border-black tablinkStormMd" onclick="openStormMd(event,'SatelliteMd')" style="border-top-left-radius: 20px; border-top-right-radius: 20px; margin-right: 2px; background: #fcfcfc;">SATELLITE
                    </button>
                </div>

                <!-- CHANGEME: LOCAL IMPACTS - w3-hide WHEN NOT IN USE -->
                <div id="Local_Md" class="w3-hide">
                    <button class="w3-bar-item w3-button w3-border w3-regular w3-border-black tablinkStormMd" onclick="openStormMd(event,'RadarsMd')" style="border-top-left-radius: 20px; border-top-right-radius: 20px; margin-right: 2px; background: #ffffff;">RADARS
                    </button>
                    <button class="w3-bar-item w3-button w3-border w3-regular w3-border-black tablinkStormMd" onclick="openStormMd(event,'LocalMd')" style="border-top-left-radius: 20px; border-top-right-radius: 20px; margin-right: 2px; background: #ffffff;">LOCAL
                        IMPACTS
                    </button>
                </div>

            </div>
        </div>

        <!-- CURRENT - MEDIUM -->
        <div id="CurrentMd" class="w3-container w3-white w3-border-2 w3-border-indigo w3-padding StormMd" style="border-radius: 20px; margin-bottom: 20px;">
            <div class="w3-row">
                <div class="w3- col w3-text-indigo w3-padding w3-xlarge w3-text-black altfont">
                    <div style="padding-bottom: 10px;">

                        <!-- CHANGEME:- CATEGORY - IF Hurricane -->
                        <!-- <span
                                class="w3-large w3-text-red w3-bold"><?php echo $system02->systemSaffirSimpsonCategory; ?></span>-->

                        <!-- CHANGEME:- STORM NUMBER -->
                        <span class="w3-xlarge w3-text-red w3-bold"><?php echo $system02->systemType; ?></span>

                    </div>

                    <!-- CHANGEME:- STORM NUMBER -->
                    <div class="w3-alert w3-large w3-text-indigo">
                        <div>
                            <span class="w3-text-black">LOCATION:</span>&nbsp;&nbsp;
                            <?php echo $system02->centerLocLatitude; ?>N&nbsp;
                            <?php echo $system02->centerLocLongitude; ?>W
                        </div>
                        <div>
                            <span class="w3-text-black">MAXIMUM SUSTAINED WINDS:</span>&nbsp;&nbsp;
                            <?php echo $system02->systemIntensityMph; ?> MPH
                        </div>
                        <div>
                            <span class="w3-text-black">MINIMUM CENTRAL PRESSURE:</span>
                            <?php echo $system02->systemMslpMb; ?> mb
                        </div>
                        <div>
                            <span class="w3-text-black">MOVING:</span>
                            <?php echo $system02->systemDirectionOfMotion; ?>&nbsp;at&nbsp;
                            <?php echo $system02->systemSpeedMph; ?>&nbsp;MPH
                        </div>
                        <br>
                        <div>
                            <span class="w3-text-black">THE CENTER OF</span>
                            <?php echo $system02->systemType; ?>
                            <?php echo $system02->systemName; ?>&nbsp;IS:
                            <span class="w3-large">
                                <?php echo $system02->systemGeoRefPt1; ?><br>
                                &nbsp;<?php echo $system02->systemGeoRefPt2; ?>
                            </span>
                        </div>
                    </div>
                </div>

                <div class="w3-col">
                    <div class="w3-row">

                        <div class="w3-col w3-padding m4">
                            <!-- CHANGEME: - STORM NUMBER -->
                            <img src="images/blank.gif" data-src="https://www.nhc.noaa.gov/storm_graphics/AT02/AL022024_5day_cone_no_line_and_wind.png" alt="NHC 5 Day Track" style="width: 190px; height: 190px;" class="lazyload w3-border w3-border-gray w3-round">
                            <div class="w3-alert w3-small w3-margin altfont">
                                FIVE DAY TRACK - NHC
                            </div>
                        </div>

                        <div class="w3-col w3-padding m4">
                            <!-- CHANGEME: - w3-hide STORM NUMBER OR REGIONAL SATELLITE -->
                            <img src="images/blank.gif" id="Floater_Satellite_Md" data-src="https://cdn.star.nesdis.noaa.gov/FLOATER/data/AL022024/13/500x500.jpg" alt="Floater Satellite" style="width: 190px; height: 190px;" class="lazyload w3-border w3-border-gray w3-round"><br>

                            <img src="images/blank.gif" id="Regional_Satellite_Md" data-src="https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/taw/13/1800x1080.jpg" alt="Regional Satellite" style="width: 190px; height: 190px;" class="w3-hide lazyload w3-border w3-border-gray w3-round">
                            <div class="w3-alert w3-small w3-margin altfont">
                                FLOATER SATELLITE - NOAA
                            </div>
                        </div>

                        <div class="w3-col w3-padding m4">
                            <!-- CHANGEME: - STORM NUMBER -->
                            <img src="images/blank.gif" data-src="https://www.nhc.noaa.gov/storm_graphics/AT02/AL022024_most_likely_toa_34.png" alt="NHC Likely Arrival of Tropical Storm Force Winds" style="width: 190px; height: 190px;" class="lazyload w3-border w3-border-gray w3-round">
                            <div class="w3-alert w3-small w3-margin altfont">
                                ARRIVAL OF 34 KT+ WINDS - NHC
                            </div>
                        </div>

                        <div class="w3-hide w3-col w3-padding l6">
                            <!-- CHANGEME: - w3-hide WHEN NOT IN RANGE OF COAST -->
                            <img src="images/blank.gif" data-src="https://radar.weather.gov/lite/N0R/LTX_0.png" alt="Local Radar" style="width: 190px; height: 190px;" class="lazyload w3-border w3-border-gray w3-round"><br>
                            <div class="w3-alert w3-small w3-margin altfont">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                WILMINGTON, NC RADAR - NWS
                            </div>
                        </div>
                    </div>
                </div>
                <div class="w3-col w3-center">
                    <a href="https://www.nhc.noaa.gov/" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;INFORMATION FROM THE NATIONAL HURRICANE CENTER</a>
                </div>
            </div>
        </div>

        <!-- TEXT - MEDIUM -->
        <div id="NHCTextMd" class="w3-container w3-white w3-border-2 w3-border-indigo w3-padding StormMd" style="border-radius: 20px; display:none; margin-bottom: 20px;">
            <div class="w3-row">
                <div class="w3-col w3-left w3-alert altfont" style="width:30%">
                    <div class="w3-alert w3-bar w3-bar-block">
                        <button class="w3-alert w3-hide tablinkTextMd" onclick="openTextMd(event,'TextMd0')">&nbsp;
                        </button>
                        <div class="w3-alert w3-large w3-padding w3-text-indigo w3-bold" style="text-decoration: underline;">NHC
                            ADVISORIES
                        </div>
                        <button class="w3-bar-item w3-button w3-round-large w3-regular tablinkTextMd" onclick="openTextMd(event,'TextMd1')">PUBLIC
                            ADVISORY</button>
                        <button class="w3-bar-item w3-button w3-round-large w3-regular tablinkTextMd" onclick="openTextMd(event,'TextMd2')">DISCUSSION</button>
                        <button class="w3-bar-item w3-button w3-round-large w3-regular tablinkTextMd" onclick="openTextMd(event,'TextMd3')">FORECAST
                            ADVISORY</button>
                        <button class="w3-bar-item w3-button w3-round-large w3-regular tablinkTextMd" onclick="openTextMd(event,'TextMd4')">WIND SPEED
                            PROBABILITIES</button>

                        <!-- CHANGEME: - w3-hide WHEN NO WATCHES/WARNINGS ISSUED -->
                        <button class="w3-hide w3-bar-item w3-button w3-round-large w3-regular tablinkTextMd" onclick="openTextMd(event,'TextMd5')">TROPICAL
                            CYCLONE BREAKPOINTS</button>

                        <button class="w3-bar-item w3-button w3-round-large w3-regular tablinkTextMd" onclick="openTextMd(event,'TextMd6')">ICAO (AVIATION)
                            ADVISORY</button>
                        <button class="w3-hide w3-bar-item w3-button w3-round-large w3-regular tablinkTextMd" onclick="openTextMd(event,'TextMd7')">AVISO PÚBLICO DE
                            ATLÁNTICO</button>
                    </div>
                </div>

                <div class="w3-rest w3-alert">
                    <div id="TextMd0" class="w3-container w3-center TextMd">
                        <img src="images/blank.gif" data-src="../images/text_card.gif" alt="Placecard" style="width:100%; max-width:400px;" class="lazyload w3-center">
                    </div>

                    <div id="TextMd1" class="w3-display-container w3-small TextMd" style="display:none;">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkTextMd" onclick="openTextMd(event,'Text0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>
                        <div class="w3-container">
                            <div>
                                <a href="https://www.nhc.noaa.gov/" target="_blank" class="w3-button w3-indigo w3-tiny w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                            </div>
                            <!-- CHANGEME: - STORM NUMBER -->
                            <?php
                            $pub3 = simplexml_load_file("../xml/02_public.xml");
                            echo $pub3->channel->item->description;
                            ?>
                        </div>
                    </div>

                    <div id="TextMd2" class="w3-display-container w3-small TextMd" style="display:none;">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkTextMd" onclick="openTextMd(event,'Text0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <div class="w3-container">
                            <div>
                                <a href="https://www.nhc.noaa.gov/" target="_blank" class="w3-button w3-indigo w3-tiny w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                            </div>
                            <!-- CHANGEME: - STORM NUMBER -->
                            <?php
                            $disc3 = simplexml_load_file("../xml/02_discussion.xml");
                            echo $disc3->channel->item->description;
                            ?>
                        </div>
                    </div>

                    <div id="TextMd3" class="w3-display-container w3-small TextMd" style="display:none;">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkTextMd" onclick="openTextMd(event,'Text0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <div class="w3-container">
                            <div>
                                <a href="https://www.nhc.noaa.gov/" target="_blank" class="w3-button w3-indigo w3-tiny w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                            </div>
                            <!-- CHANGEME: - STORM NUMBER -->
                            <?php
                            $fore3 = simplexml_load_file("../xml/02_forecast.xml");
                            echo $fore3->channel->item->description;
                            ?>
                        </div>
                    </div>

                    <div id="TextMd4" class="w3-display-container w3-small TextMd" style="display:none;">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkTextMd" onclick="openTextMd(event,'Text0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <div class="w3-container">
                            <div>
                                <a href="https://www.nhc.noaa.gov/" target="_blank" class="w3-button w3-indigo w3-tiny w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                            </div>
                            <!-- CHANGEME: - STORM NUMBER -->
                            <?php
                            $wind3 = simplexml_load_file("../xml/02_wind.xml");
                            echo $wind3->channel->item->description;
                            ?>
                        </div>
                    </div>

                    <div id="TextMd5" class="w3-display-container w3-small TextMd" style="display:none;">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkTextMd" onclick="openTextMd(event,'Text0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <div class="w3-container">
                            <div>
                                <a href="https://www.nhc.noaa.gov/" target="_blank" class="w3-button w3-indigo w3-tiny w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                            </div>
                            <!-- CHANGEME: - STORM NUMBER -->
                            <?php
                            $wwa3 = simplexml_load_file("../xml/02_breakpoints.xml");
                            echo $wwa3->channel->item->description;
                            ?>
                        </div>
                    </div>

                    <div id="TextMd6" class="w3-display-container w3-small TextMd" style="display:none;">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkTextMd" onclick="openTextMd(event,'Text0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <div class="w3-container">
                            <div>
                                <a href="https://www.nhc.noaa.gov/" target="_blank" class="w3-button w3-indigo w3-tiny w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                            </div>
                            <!-- CHANGEME: - STORM NUMBER -->
                            <?php
                            $avia3 = simplexml_load_file("../xml/02_aviation.xml");
                            echo $avia3->channel->item->description;
                            ?>
                        </div>
                    </div>

                    <div id="TextMd7" class="w3-display-container w3-small TextMd" style="display:none;">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkTextMd" onclick="openTextMd(event,'TextMd0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <div class="w3-container">
                            <div>
                                <a href="https://www.nhc.noaa.gov/" target="_blank" class="w3-button w3-indigo w3-tiny w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                            </div>
                            <!-- CHANGEME: - STORM NUMBER -->
                            <?php
                            $esp3 = simplexml_load_file("../xml/02_espanol.xml");
                            echo $esp3->channel->item->description;
                            ?>
                        </div>
                    </div>
                </div>

            </div>
        </div>

        <!-- GRAPHICS - MEDIUM -->
        <div id="GraphicsMd" class="w3-container w3-white w3-border-2 w3-border-indigo w3-padding StormMd" style="border-radius: 20px; display:none; margin-bottom: 20px;">
            <div class="w3-row">
                <div class="w3-col w3-alert altfont" style="width:30%;">
                    <div class="w3-alert w3-bar w3-bar-block">
                        <div class="w3-alert w3-large w3-padding w3-text-indigo w3-bold" style="text-decoration: underline;">STORM GRAPHICS
                        </div>
                        <button class="w3-hide w3-bar-item tablinkGraphicMd" onclick="openGraphicMd(event,'GraphicMd0')">&nbsp; </button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkGraphicMd" onclick="openGraphicMd(event,'GraphicMd1')">3-DAY FORECAST</button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkGraphicMd" onclick="openGraphicMd(event,'GraphicMd2')">5-DAY FORECAST</button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkGraphicMd" onclick="openGraphicMd(event,'GraphicMd3')">CURRENT WINDS</button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkGraphicMd" onclick="openGraphicMd(event,'GraphicMd4')">WIND SWATH</button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkGraphicMd" onclick="openGraphicMd(event,'GraphicMd5')">LIKELY ARRIVAL OF TS
                            WINDS</button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkGraphicMd" onclick="openGraphicMd(event,'GraphicMd6')">EARLIEST ARRIVAL OF TS
                            WINDS</button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkGraphicMd" onclick="openGraphicMd(event,'GraphicMd7')">TS FORCE WINDS
                            PROBABILITY</button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkGraphicMd" onclick="openGraphicMd(event,'GraphicMd8')">50-KNOT WINDS
                            PROBABILITY</button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkGraphicMd" onclick="openGraphicMd(event,'GraphicMd9')">HURRICANE-FORCE WINDS
                            PROBABILITY</button>
                    </div>
                </div>

                <div class="w3-rest w3-center w3-alert">

                    <div id="GraphicMd0" class="w3-container w3-center GraphicMd">
                        <img src="images/blank.gif" data-src="../images/sat_card.gif" alt="Placecard" style="width:100%; max-width:400px;" class="lazyload">
                    </div>

                    <div id="GraphicMd1" class="w3-display-container w3-regular GraphicMd" style="display:none;">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkGraphicMd" onclick="openGraphicMd(event,'GraphicMd0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <div class="w3-container">
                            <!-- CHANGEME: - STORM NUMBER -->
                            <img src="images/blank.gif" data-src="https://www.nhc.noaa.gov/storm_graphics/AT02/AL022024_3day_cone_no_line_and_wind.png" alt="NHC 3 Day Track" style="width:100%; max-width:550px;" class="lazyload">
                            <div>
                                <a href="https://www.nhc.noaa.gov/" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                            </div>
                        </div>
                    </div>

                    <div id="GraphicMd2" class="w3-display-container w3-regular GraphicMd" style="display:none;">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkGraphicMd" onclick="openGraphicMd(event,'GraphicMd0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <div class="w3-container">
                            <!-- CHANGEME: - STORM NUMBER -->
                            <img src="images/blank.gif" data-src="https://www.nhc.noaa.gov/storm_graphics/AT02/AL022024_5day_cone_no_line_and_wind.png" alt="NHC 5 Day Track" style="width:100%; max-width:550px;" class="lazyload">
                            <div>
                                <a href="https://www.nhc.noaa.gov/" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                            </div>
                        </div>
                    </div>

                    <div id="GraphicMd3" class="w3-display-container w3-regular GraphicMd" style="display:none;">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkGraphicMd" onclick="openGraphicMd(event,'GraphicMd0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <div class="w3-container">
                            <!-- CHANGEME: - STORM NUMBER -->
                            <img src="images/blank.gif" data-src="https://www.nhc.noaa.gov/storm_graphics/AT02/AL022024_current_wind.png" alt="NHC Current Winds" style="width:100%; max-width:550px;" class="lazyload">
                            <div>
                                <a href="https://www.nhc.noaa.gov/" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                            </div>
                        </div>
                    </div>

                    <div id="GraphicMd4" class="w3-display-container w3-regular GraphicMd" style="display:none;">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkGraphicMd" onclick="openGraphicMd(event,'GraphicMd0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <div class="w3-container">
                            <!-- CHANGEME: - STORM NUMBER -->
                            <img src="images/blank.gif" data-src="https://www.nhc.noaa.gov/storm_graphics/AT02/AL022024_wind_history.png" alt="NHC Wind History" style="width:100%; max-width:550px;" class="lazyload">
                            <div>
                                <a href="https://www.nhc.noaa.gov/" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                            </div>
                        </div>
                    </div>

                    <div id="GraphicMd5" class="w3-display-container w3-regular GraphicMd" style="display:none;">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkGraphicMd" onclick="openGraphicMd(event,'GraphicMd0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <div class="w3-container">
                            <!-- CHANGEME: - STORM NUMBER -->
                            <img src="images/blank.gif" data-src="https://www.nhc.noaa.gov/storm_graphics/AT02/AL022024_most_likely_toa_34.png" alt="NHC Likely Arrival of Tropical Storm Force Winds" style="width:100%; max-width:550px;" class="lazyload">
                            <div>
                                <a href="https://www.nhc.noaa.gov/" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                            </div>
                        </div>
                    </div>

                    <div id="GraphicMd6" class="w3-display-container w3-regular GraphicMd" style="display:none;">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkGraphicMd" onclick="openGraphicMd(event,'GraphicMd0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <div class="w3-container">
                            <!-- CHANGEME: - STORM NUMBER -->
                            <img src="images/blank.gif" data-src="https://www.nhc.noaa.gov/storm_graphics/AT02/AL022024_earliest_reasonable_toa_34.png" alt="NHC Reasonable Arrival of Tropical Storm Force Winds" style="width:100%; max-width:550px;" class="lazyload">
                            <div>
                                <a href="https://www.nhc.noaa.gov/" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                            </div>
                        </div>
                    </div>

                    <div id="GraphicMd7" class="w3-display-container w3-regular GraphicMd" style="display:none;">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkGraphicMd" onclick="openGraphicMd(event,'GraphicMd0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <div class="w3-container">
                            <!-- CHANGEME: - STORM NUMBER -->
                            <img src="images/blank.gif" data-src="https://www.nhc.noaa.gov/storm_graphics/AT02/AL022024_wind_probs_34_F120.png" alt="NHC 34 Knot Wind Probability" style="width:100%; max-width:550px;" class="lazyload">
                            <div>
                                <a href="https://www.nhc.noaa.gov/" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                            </div>
                        </div>
                    </div>

                    <div id="GraphicMd8" class="w3-display-container w3-regular GraphicMd" style="display:none;">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkGraphicMd" onclick="openGraphicMd(event,'GraphicMd0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <div class="w3-container">
                            <!-- CHANGEME: - STORM NUMBER -->
                            <img src="images/blank.gif" data-src="https://www.nhc.noaa.gov/storm_graphics/AT02/AL022024_wind_probs_50_F120.png" alt="NHC 50 Knot Wind Probability" style="width:100%; max-width:550px;" class="lazyload">
                            <div>
                                <a href="https://www.nhc.noaa.gov/" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                            </div>
                        </div>
                    </div>

                    <div id="GraphicMd9" class="w3-display-container w3-regular GraphicMd" style="display:none;">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkGraphicMd" onclick="openGraphicMd(event,'GraphicMd0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <div class="w3-container">
                            <!-- CHANGEME: - STORM NUMBER -->
                            <img src="images/blank.gif" data-src="https://www.nhc.noaa.gov/storm_graphics/AT02/AL022024_wind_probs_64_F120.png" alt="NHC 64 Knot Wind Probability" style="width:100%; max-width:550px;" class="lazyload">
                            <div>
                                <a href="https://www.nhc.noaa.gov/" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>

        <!-- SATELLITE - MEDIUM -->
        <div id="SatelliteMd" class="w3-container w3-white w3-border-2 w3-border-indigo w3-padding StormMd" style="border-radius: 20px; display:none; margin-bottom: 20px;">

            <!-- CHANGEME: - w3-hide WHEN NO FLOATERS ARE ACTIVE -->
            <div id="Floater_Present_Md" class="w3-row">
                <!-- FLOATERS -->
                <div id="Floaters_Yes_Md" class="w3-col w3-alert altfont" style="width:30%;">
                    <div class="w3-alert w3-bar w3-bar-block">
                        <div class="w3-alert w3-large w3-padding w3-text-indigo w3-bold" style="text-decoration: underline;">FLOATER IMAGES</div>
                        <button class="w3-hide w3-bar-item w3-button w3-regular w3-round-large tablinkSatMd" onclick="openSatMd(event,'SatMd0')">&nbsp;</button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkSatMd" onclick="openSatMd(event,'SatMd1')">GEOCOLOR</button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkSatMd" onclick="openSatMd(event,'SatMd2')">BLUE VISIBLE</button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkSatMd" onclick="openSatMd(event,'SatMd3')">RED VISIBLE</button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkSatMd" onclick="openSatMd(event,'SatMd4')">SHORTWAVE IR</button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkSatMd" onclick="openSatMd(event,'SatMd5')">CLEAN INFRARED</button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkSatMd" onclick="openSatMd(event,'SatMd6')">INFRARED</button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkSatMd" onclick="openSatMd(event,'SatMd7')">DIRTY INFRARED</button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkSatMd" onclick="openSatMd(event,'SatMd8')">LOWER LEVEL WATER VAPOR</button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkSatMd" onclick="openSatMd(event,'SatMd9')">MID LEVEL WATER VAPOR</button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkSatMd" onclick="openSatMd(event,'SatMd10')">UPPER LEVEL WATER VAPOR</button>
                    </div>
                </div>

                <!-- FLOATER IMAGES -->
                <div id="Floater_Images_Yes_Md" class="w3-rest w3-alert">
                    <div class="w3-alert w3-center">

                        <div id="SatMd0" class="w3-container SatMd">
                            <div class="w3-container">
                                <img src="images/blank.gif" data-src="../images/sat_card.gif" alt="Placecard" style="width:100%; max-width:400px;" class="lazyload">
                            </div>
                        </div>

                        <div id="SatMd1" class="w3-display-container w3-regular SatMd" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSatMd" onclick="openSatMd(event,'SatMd0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <div class="w3-container">
                                <!-- CHANGEME: - STORM NUMBER -->
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/FLOATER/data/AL022024/GEOCOLOR/500x500.jpg" alt="Floater Satellite" style="width:100%; max-width:500px;" class="lazyload">
                            </div>
                            <div>
                                <!-- CHANGEME: - STORM NUMBER -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/floater.php?stormid=AL022024" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST STORM FLOATER PAGE</a>
                            </div>
                        </div>

                        <div id="SatMd2" class="w3-display-container w3-regular SatMd" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSatMd" onclick="openSatMd(event,'SatMd0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <div class="w3-container">
                                <!-- CHANGEME: - STORM NUMBER -->
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/FLOATER/data/AL022024/01/500x500.jpg" alt="Floater Satellite" style="width:100%; max-width:500px;" class="lazyload">
                            </div>
                            <div>
                                <!-- CHANGEME: - STORM NUMBER -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/floater.php?stormid=AL022024" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST STORM FLOATER PAGE</a>
                            </div>
                        </div>

                        <div id="SatMd3" class="w3-display-container w3-regular SatMd" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSatMd" onclick="openSatMd(event,'SatMd0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <div class="w3-container">
                                <!-- CHANGEME: - STORM NUMBER -->
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/FLOATER/data/AL022024/02/500x500.jpg" alt="Floater Satellite" style="width:100%; max-width:500px;" class="lazyload">
                            </div>
                            <div>
                                <!-- CHANGEME: - STORM NUMBER -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/floater.php?stormid=AL022024" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST STORM FLOATER PAGE</a>
                            </div>
                        </div>

                        <div id="SatMd4" class="w3-display-container w3-regular SatMd" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSatMd" onclick="openSatMd(event,'SatMd0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <div class="w3-container">
                                <!-- CHANGEME: - STORM NUMBER -->
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/FLOATER/data/AL022024/07/500x500.jpg" alt="Floater Satellite" style="width:100%; max-width:500px;" class="lazyload">
                            </div>
                            <div>
                                <!-- CHANGEME: - STORM NUMBER -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/floater.php?stormid=AL022024" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST STORM FLOATER PAGE</a>
                            </div>
                        </div>

                        <div id="SatMd5" class="w3-display-container w3-regular SatMd" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSatMd" onclick="openSatMd(event,'SatMd0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <div class="w3-container">
                                <!-- CHANGEME: - STORM NUMBER -->
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/FLOATER/data/AL022024/13/500x500.jpg" alt="Floater Satellite" style="width:100%; max-width:500px;" class="lazyload">
                            </div>
                            <div>
                                <!-- CHANGEME: - STORM NUMBER -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/floater.php?stormid=AL022024" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST STORM FLOATER PAGE</a>
                            </div>
                        </div>

                        <div id="SatMd6" class="w3-display-container w3-regular SatMd" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSatMd" onclick="openSatMd(event,'SatMd0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <div class="w3-container">
                                <!-- CHANGEME: - STORM NUMBER -->
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/FLOATER/data/AL022024/14/500x500.jpg" alt="Floater Satellite" style="width:100%; max-width:500px;" class="lazyload">
                            </div>
                            <div>
                                <!-- CHANGEME: - STORM NUMBER -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/floater.php?stormid=AL022024" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST STORM FLOATER PAGE</a>
                            </div>
                        </div>

                        <div id="SatMd7" class="w3-display-container w3-regular SatMd" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSatMd" onclick="openSatMd(event,'SatMd0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <div class="w3-container">
                                <!-- CHANGEME: - STORM NUMBER -->
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/FLOATER/data/AL022024/15/500x500.jpg" alt="Floater Satellite" style="width:100%; max-width:500px;" class="lazyload">
                            </div>
                            <div>
                                <!-- CHANGEME: - STORM NUMBER -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/floater.php?stormid=AL022024" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST STORM FLOATER PAGE</a>
                            </div>
                        </div>

                        <div id="SatMd8" class="w3-display-container w3-regular SatMd" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSatMd" onclick="openSatMd(event,'SatMd0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <div class="w3-container">
                                <!-- CHANGEME: - STORM NUMBER -->
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/FLOATER/data/AL022024/08/500x500.jpg" alt="Floater Satellite" style="width:100%; max-width:500px;" class="lazyload">
                            </div>
                            <div>
                                <!-- CHANGEME: - STORM NUMBER -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/floater.php?stormid=AL022024" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST STORM FLOATER PAGE</a>
                            </div>
                        </div>

                        <div id="SatMd9" class="w3-display-container w3-regular SatMd" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSatMd" onclick="openSatMd(event,'SatMd0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <div class="w3-container">
                                <!-- CHANGEME: - STORM NUMBER -->
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/FLOATER/data/AL022024/09/500x500.jpg" alt="Floater Satellite" style="width:100%; max-width:500px;" class="lazyload">
                            </div>
                            <div>
                                <!-- CHANGEME: - STORM NUMBER -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/floater.php?stormid=AL022024" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST STORM FLOATER PAGE</a>
                            </div>
                        </div>

                        <div id="SatMd10" class="w3-display-container w3-regular SatMd" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSatMd" onclick="openSatMd(event,'SatMd0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <div class="w3-container">
                                <!-- CHANGEME: - STORM NUMBER -->
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/FLOATER/data/AL022024/10/500x500.jpg" alt="Floater Satellite" style="width:100%; max-width:500px;" class="lazyload">
                            </div>
                            <div>
                                <!-- CHANGEME: - STORM NUMBER -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/floater.php?stormid=AL022024" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST STORM FLOATER PAGE</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- REGIONAL SATELLITE -->
            <!-- CHANGEME: - w3-hide WHEN FLOATERS ARE ACTIVE -->
            <div id="Floaters_Absent_Medium" class="w3-hide w3-row">
                <div id="Floaters_No" class="w3-col w3-alert altfont" style="width:30%;">
                    <div class="w3-alert w3-bar w3-bar-block">
                        <div class="w3-alert w3-large w3-padding w3-text-indigo w3-bold" style="text-decoration: underline;">REGIONAL IMAGES</div>
                        <button class="w3-hide w3-bar-item tablinkSatMdA" onclick="openSatMdA(event,'SatMdA0A')">&nbsp;</button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkSatMdA" onclick="openSatMdA(event,'SatMdA1A')">GEOCOLOR</button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkSatMdA" onclick="openSatMdA(event,'SatMdA2A')">BLUE VISIBLE</button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkSatMdA" onclick="openSatMdA(event,'SatMdA3A')">RED VISIBLE</button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkSatMdA" onclick="openSatMdA(event,'SatMdA4A')">SHORTWAVE IR</button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkSatMdA" onclick="openSatMdA(event,'SatMdA5A')">CLEAN INFRARED</button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkSatMdA" onclick="openSatMdA(event,'SatMdA6A')">INFRARED</button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkSatMdA" onclick="openSatMdA(event,'SatMdA7A')">DIRTY INFRARED</button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkSatMdA" onclick="openSatMdA(event,'SatMdA8A')">LOWER LEVEL WATER VAPOR</button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkSatMdA" onclick="openSatMdA(event,'SatMdA9A')">MID LEVEL WATER VAPOR</button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkSatMdA" onclick="openSatMdA(event,'SatMdA10A')">UPPER LEVEL WATER VAPOR</button>
                    </div>
                </div>

                <!-- REGIONAL IMAGES -->
                <div id="Floater_Images_No" class="w3-rest w3-alert">
                    <div class="w3-alert w3-center">

                        <div id="SatMdA0A" class="w3-container SatMdA">
                            <div class="w3-container">
                                <img src="images/blank.gif" data-src="../images/SAT_card.gif" alt="Placecard" style="width:100%; max-width:400px;" class="lazyload">
                            </div>
                        </div>

                        <div id="SatMdA1A" class="w3-display-container w3-regular SatMdA" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSatMdA" onclick="openSatMdA(event,'SatMdA0A')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <!--CHANGEME: REGIONAL LOCATION -->
                            <div class="w3-container">
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/taw/GEOCOLOR/1800x1080.jpg" alt="Regional Satellite" style="width:100%; max-width:800px;" class="lazyload">
                            </div>
                            <div>
                                <!--CHANGEME: REGIONAL LOCATION -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/sector.php?sat=G16&sector=taw" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!--CHANGEME: REGIONAL LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST
                                    WESTERN ATLANTIC SATELLITE PAGE
                                </a>
                            </div>

                        </div>

                        <div id="SatMdA2A" class="w3-display-container w3-regular SatMdA" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSatMdA" onclick="openSatMdA(event,'SatMdA0A')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <!--CHANGEME: REGIONAL LOCATION -->
                            <div class="w3-container">
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/taw/01/1800x1080.jpg" alt="Regional Satellite" style="width:100%; max-width:800px;" class="lazyload">
                            </div>
                            <div>
                                <!--CHANGEME: REGIONAL LOCATION -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/sector.php?sat=G16&sector=taw" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!--CHANGEME: REGIONAL LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST
                                    WESTERN ATLANTIC SATELLITE PAGE
                                </a>
                            </div>

                        </div>

                        <div id="SatMdA3A" class="w3-display-container w3-regular SatMdA" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSatMdA" onclick="openSatMdA(event,'SatMdA0A')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <!--CHANGEME: REGIONAL LOCATION -->
                            <div class="w3-container">
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/taw/02/1800x1080.jpg" alt="Regional Satellite" style="width:100%; max-width:800px;" class="lazyload">
                            </div>
                            <div>
                                <!--CHANGEME: REGIONAL LOCATION -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/sector.php?sat=G16&sector=taw" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!--CHANGEME: REGIONAL LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST
                                    WESTERN ATLANTIC SATELLITE PAGE
                                </a>
                            </div>
                        </div>

                        <div id="SatMdA4A" class="w3-display-container w3-regular SatMdA" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSatMdA" onclick="openSatMdA(event,'SatMdA0A')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <!--CHANGEME: REGIONAL LOCATION -->
                            <div class="w3-container">
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/taw/07/1800x1080.jpg" alt="Regional Satellite" style="width:100%; max-width:800px;" class="lazyload">
                            </div>
                            <div>
                                <!--CHANGEME: REGIONAL LOCATION -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/sector.php?sat=G16&sector=taw" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!--CHANGEME: REGIONAL LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST
                                    WESTERN ATLANTIC SATELLITE PAGE
                                </a>
                            </div>
                        </div>

                        <div id="SatMdA5A" class="w3-display-container w3-regular SatMdA" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSatMdA" onclick="openSatMdA(event,'SatMdA0A')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <!--CHANGEME: REGIONAL LOCATION -->
                            <div class="w3-container">
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/taw/13/1800x1080.jpg" alt="Regional Satellite" style="width:100%; max-width:800px;" class="lazyload">
                            </div>
                            <div>
                                <!--CHANGEME: REGIONAL LOCATION -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/sector.php?sat=G16&sector=taw" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!--CHANGEME: REGIONAL LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST
                                    WESTERN ATLANTIC SATELLITE PAGE
                                </a>
                            </div>
                        </div>

                        <div id="SatMdA6A" class="w3-display-container w3-regular SatMdA" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSatMdA" onclick="openSatMdA(event,'SatMdA0A')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <!--CHANGEME: REGIONAL LOCATION -->
                            <div class="w3-container">
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/taw/14/1800x1080.jpg" alt="Regional Satellite" style="width:100%; max-width:800px;" class="lazyload">
                            </div>
                            <div>
                                <!--CHANGEME: REGIONAL LOCATION -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/sector.php?sat=G16&sector=taw" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!--CHANGEME: REGIONAL LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST
                                    WESTERN ATLANTIC SATELLITE PAGE
                                </a>
                            </div>
                        </div>

                        <div id="SatMdA7A" class="w3-display-container w3-regular SatMdA" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSatMdA" onclick="openSatMdA(event,'SatMdA0A')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <!--CHANGEME: REGIONAL LOCATION -->
                            <div class="w3-container">
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/taw/15/1800x1080.jpg" alt="Regional Satellite" style="width:100%; max-width:800px;" class="lazyload">
                            </div>
                            <div>
                                <!--CHANGEME: REGIONAL LOCATION -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/sector.php?sat=G16&sector=taw" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!--CHANGEME: REGIONAL LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST
                                    WESTERN ATLANTIC SATELLITE PAGE
                                </a>
                            </div>
                        </div>

                        <div id="SatMdA8A" class="w3-display-container w3-regular SatMdA" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSatMdA" onclick="openSatMdA(event,'SatMdA0A')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <!--CHANGEME: REGIONAL LOCATION -->
                            <div class="w3-container">
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/taw/08/1800x1080.jpg" alt="Regional Satellite" style="width:100%; max-width:800px;" class="lazyload">
                            </div>
                            <div>
                                <!--CHANGEME: REGIONAL LOCATION -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/sector.php?sat=G16&sector=taw" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!--CHANGEME: REGIONAL LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST
                                    WESTERN ATLANTIC SATELLITE PAGE
                                </a>
                            </div>
                        </div>

                        <div id="SatMdA9A" class="w3-display-container w3-regular SatMdA" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSatMdA" onclick="openSatMdA(event,'SatMdA0A')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <!--CHANGEME: REGIONAL LOCATION -->
                            <div class="w3-container">
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/taw/09/1800x1080.jpg" alt="Regional Satellite" style="width:100%; max-width:800px;" class="lazyload">
                            </div>
                            <div>
                                <!--CHANGEME: REGIONAL LOCATION -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/sector.php?sat=G16&sector=taw" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!--CHANGEME: REGIONAL LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST
                                    WESTERN ATLANTIC SATELLITE PAGE
                                </a>
                            </div>
                        </div>

                        <div id="SatMdA10A" class="w3-display-container w3-regular SatMdA" style="display:none;">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSatMdA" onclick="openSatMdA(event,'SatMdA0A')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>

                            <!--CHANGEME: REGIONAL LOCATION -->
                            <div class="w3-container">
                                <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/taw/10/1800x1080.jpg" alt="Regional Satellite" style="width:100%; max-width:800px;" class="lazyload">
                            </div>
                            <div>
                                <!--CHANGEME: REGIONAL LOCATION -->
                                <a href="https://www.star.nesdis.noaa.gov/GOES/sector.php?sat=G16&sector=taw" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!--CHANGEME: REGIONAL LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;GOES-EAST
                                    WESTERN ATLANTIC SATELLITE PAGE
                                </a>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>

        <!-- LOCAL_IMPACTS: -->
        <!-- RADARS - MEDIUM -->
        <div id="RadarsMd" class="w3-container w3-white w3-border-2 w3-border-indigo w3-padding StormMd" style="border-radius: 20px; display:none; margin-bottom: 20px;">

            <div class="w3-row">
                <div class="w3-col w3-left w3-alert altfont" style="width:25%;">
                    <div class="w3-alert w3-bar w3-bar-block">
                        <button class="w3-bar-item w3-button w3-regular w3-round-large w3-hide tablinkRadMd" onclick="openRadMd(event,'RadMd0')">&nbsp;</button>

                        <!-- RADAR SITE 1 -->
                        <div id="Radar_Site_1_Md" class="w3-bottombar">
                            <div class="w3-alert w3-large w3-padding w3-text-indigo w3-bold" style="text-decoration: underline;">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                NEWPORT, NC
                            </div>
                            <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkRadMd" onclick="openRadMd(event,'RadMd1')">SHORT RANGE IMAGE</button>
                            <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkRadMd" onclick="openRadMd(event,'RadMd2')">SHORT RANGE LOOP</button>
                            <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkRadMd" onclick="openRadMd(event,'RadMd3')">LONG RANGE</button>
                            <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkRadMd" onclick="openRadMd(event,'RadMd4')">LONG RANGE LOOP</button>
                        </div>

                        <!-- RADAR SITE 2 - w3-hide WHEN NOT IN USE -->
                        <div id="Radar_Site_2_Md" class="">
                            <div class="w3-alert w3-large w3-padding w3-text-indigo w3-bold" style="text-decoration: underline;">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                WAKEFIELD, VA
                            </div>
                            <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkRadMd" onclick="openRadMd(event,'RadMd5')">SHORT RANGE IMAGE</button>
                            <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkRadMd" onclick="openRadMd(event,'RadMd6')">SHORT RANGE LOOP</button>
                            <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkRadMd" onclick="openRadMd(event,'RadMd7')">LONG RANGE</button>
                            <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkRadMd" onclick="openRadMd(event,'RadMd8')">LONG RANGE LOOP</button>
                        </div>

                    </div>
                </div>

                <div class="w3-col w3-right w3-alert altfont" style="width:25%">
                    <div class="w3-alert w3-bar w3-bar-block">

                        <!-- RADAR SITE 3 - w3-hide WHEN NOT IN USE -->
                        <div id="Radar_Site_3_Md" class="w3-bottombar">
                            <div class="w3-alert w3-large w3-padding w3-padding w3-right-align w3-text-indigo w3-bold" style="text-decoration: underline;">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                DOVER, DE
                            </div>
                            <button class="w3-bar-item w3-button w3-regular w3-round-large w3-right-align tablinkRadMd" onclick="openRadMd(event,'RadMd9')">SHORT RANGE
                                IMAGE</button>
                            <button class="w3-bar-item w3-button w3-regular w3-round-large w3-right-align tablinkRadMd" onclick="openRadMd(event,'RadMd10')">SHORT RANGE
                                LOOP</button>
                            <button class="w3-bar-item w3-button w3-regular w3-round-large w3-right-align tablinkRadMd" onclick="openRadMd(event,'RadMd11')">LONG RANGE</button>
                            <button class="w3-bar-item w3-button w3-regular w3-round-large w3-right-align tablinkRadMd" onclick="openRadMd(event,'RadMd12')">LONG RANGE
                                LOOP</button>
                        </div>

                        <!-- RADAR SITE 4 - w3-hide WHEN NOT IN USE  -->
                        <div id="Radar_Site_4_Md" class="">
                            <div class="w3-alert w3-large w3-padding w3-padding w3-right-align w3-text-indigo w3-bold" style="text-decoration: underline;">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                MT HOLLY, NJ
                            </div>
                            <button class="w3-bar-item w3-button w3-regular w3-round-large w3-right-align tablinkRadMd" onclick="openRadMd(event,'RadMd13')">SHORT RANGE
                                IMAGE</button>
                            <button class="w3-bar-item w3-button w3-regular w3-round-large w3-right-align tablinkRadMd" onclick="openRadMd(event,'RadMd14')">SHORT RANGE
                                LOOP</button>
                            <button class="w3-bar-item w3-button w3-regular w3-round-large w3-right-align tablinkRadMd" onclick="openRadMd(event,'RadMd15')">LONG RANGE</button>
                            <button class="w3-bar-item w3-button w3-regular w3-round-large w3-right-align tablinkRadMd" onclick="openRadMd(event,'RadMd16')">LONG RANGE
                                LOOP</button>
                        </div>
                    </div>
                </div>

                <div class="w3-rest w3-center w3-alert">

                    <!-- COMPOSITE RADARS -->
                    <!-- CHANGEME: - w3-hide REGIONAL RADAR WHEN NOT IN RANGE -->
                    <div id="RadMd0" class="w3-container RadMd">

                        <!-- CHANGEME: - w3-hide BASED ON LOCATION  -->
                        <div id="Northeast_Comp_Md" class="w3-center">
                            <div class="w3-container w3-large w3-padding w3-padding w3-text-indigo w3-bold altfont">
                                NORTHEAST COMPOSITE LOOP
                            </div>
                            <div>
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/Conus/Loop/northeast_loop.gif" alt="Regional Radar Loop" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                        </div>

                        <!-- CHANGEME: - w3-hide BASED ON LOCATION  -->
                        <div id="Southeast_Comp_Md" class="w3-hide w3-center">
                            <div class="w3-container w3-large w3-padding w3-text-indigo w3-bold altfont">
                                SOUTHEAST COMPOSITE LOOP
                            </div>
                            <div>
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/Conus/Loop/southeast_loop.gif" alt="Regional Radar Loop" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                        </div>

                        <!-- CHANGEME: - w3-hide BASED ON LOCATION  -->
                        <div id="Gulf_Comp_Md" class="w3-hide w3-center">
                            <div class="w3-container w3-large w3-padding w3-padding w3-text-indigo w3-bold altfont">
                                CENTRAL GULF COMPOSITE LOOP
                            </div>
                            <div>
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/Conus/Loop/southmissvly_loop.gif" alt="Regional Radar Loop" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                        </div>

                        <!-- CHANGEME: - w3-hide BASED ON LOCATION  -->
                        <div id="Texas_Comp_Md" class="w3-hide w3-center">
                            <div class="w3-container w3-large w3-padding w3-padding w3-text-indigo w3-bold altfont">
                                WESTERN GULF COMPOSITE LOOP
                            </div>
                            <div>
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/Conus/Loop/southplains_loop.gif" alt="Regional Radar Loop" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                        </div>
                        <div class="w3-alert">
                            <a href="https://radar.weather.gov" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NWS MAIN RADAR PAGE</a>
                        </div>
                    </div>

                    <!-- RADAR IMAGES 1 -->
                    <div id="Radar_Images_1_Md">
                        <div id="RadMd1" class="w3-display-container RadMd" style="display:none">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRadMd" onclick="openRadMd(event,'RadMd0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>
                            <div class="w3-container">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/standard/N0R/MHX_0.png" alt="Local Radar" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                            <div class="w3-alert">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <a href="https://radar.weather.gov/ridge/radar.php?rid=mhx" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!-- CHANGEME: - RADAR LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NEWPORT NWS RADAR PAGE
                                </a>
                            </div>
                        </div>
                        <div id="RadMd2" class="w3-display-container RadMd" style="display:none">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRadMd" onclick="openRadMd(event,'RadMd0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>
                            <div class="w3-container">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/standard/N0R/MHX_loop.gif" alt="Local Radar Loop" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                            <div class="w3-alert">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <a href="https://radar.weather.gov/ridge/radar.php?rid=mhx" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!-- CHANGEME: - RADAR LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NEWPORT NWS RADAR PAGE
                                </a>
                            </div>
                        </div>
                        <div id="RadMd3" class="w3-display-container RadMd" style="display:none">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRadMd" onclick="openRadMd(event,'RadMd0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>
                            <div class="w3-container">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/standard/N0Z/MHX_0.png" alt="Local Radar" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                            <div class="w3-alert">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <a href="https://radar.weather.gov/ridge/radar.php?rid=mhx" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!-- CHANGEME: - RADAR LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NEWPORT NWS RADAR PAGE
                                </a>
                            </div>
                        </div>
                        <div id="RadMd4" class="w3-display-container RadMd" style="display:none">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRadMd" onclick="openRadMd(event,'RadMd0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>
                            <div class="w3-container">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/standard/N0Z/MHX_loop.gif" alt="Local Radar Loop" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                            <div class="w3-alert">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <a href="https://radar.weather.gov/ridge/radar.php?rid=mhx" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!-- CHANGEME: - RADAR LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NEWPORT NWS RADAR PAGE
                                </a>
                            </div>
                        </div>
                    </div>

                    <!-- RADAR IMAGES 2 -->
                    <div id="Radar_Images_2_Md">
                        <div id="RadMd5" class="w3-display-container RadMd" style="display:none">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRadMd" onclick="openRadMd(event,'RadMd0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>
                            <div class="w3-container">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/standard/N0R/AKQ_0.png" alt="Local Radar" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                            <div class="w3-alert">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <a href="https://radar.weather.gov/ridge/radar.php?rid=akq" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!-- CHANGEME: - RADAR LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;WAKEFIELD NWS RADAR PAGE
                                </a>
                            </div>
                        </div>
                        <div id="RadMd6" class="w3-display-container RadMd" style="display:none">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRadMd" onclick="openRadMd(event,'RadMd0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>
                            <div class="w3-container">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/standard/N0R/AKQ_loop.gif" alt="Local Radar Loop" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                            <div class="w3-alert">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <a href="https://radar.weather.gov/ridge/radar.php?rid=akq" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!-- CHANGEME: - RADAR LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;WAKEFIELD NWS RADAR PAGE
                                </a>
                            </div>
                        </div>
                        <div id="RadMd7" class="w3-display-container RadMd" style="display:none">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRadMd" onclick="openRadMd(event,'RadMd0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>
                            <div class="w3-container">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/standard/N0Z/AKQ_0.png" alt="Local Radar" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                            <div class="w3-alert">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <a href="https://radar.weather.gov/ridge/radar.php?rid=akq" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!-- CHANGEME: - RADAR LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;WAKEFIELD
                                    NWS RADAR PAGE
                                </a>
                            </div>
                        </div>
                        <div id="RadMd8" class="w3-display-container RadMd" style="display:none">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRadMd" onclick="openRadMd(event,'RadMd0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>
                            <div class="w3-container">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/standard/N0Z/AKQ_loop.gif" alt="Local Radar Loop" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                            <div class="w3-alert">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <a href="https://radar.weather.gov/ridge/radar.php?rid=akq" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!-- CHANGEME: - RADAR LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;WAKEFIELD
                                    NWS RADAR PAGE
                                </a>
                            </div>
                        </div>
                    </div>

                    <!-- RADAR IMAGES 3 -->
                    <div id="Radar_Images_3_Md" class="">
                        <div id="RadMd9" class="w3-display-container RadMd" style="display:none">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRadMd" onclick="openRadMd(event,'RadMd0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>
                            <div class="w3-container">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/standard/N0R/DOX_0.png" alt="Local Radar" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                            <div class="w3-alert">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <a href="https://radar.weather.gov/ridge/radar.php?rid=dox" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!-- CHANGEME: - RADAR LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;DOVER
                                    NWS RADAR PAGE
                                </a>
                            </div>
                        </div>
                        <div id="RadMd10" class="w3-display-container RadMd" style="display:none">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRadMd" onclick="openRadMd(event,'RadMd0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>
                            <div class="w3-container">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/standard/N0R/DOX_loop.gif" alt="Local Radar Loop" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                            <div class="w3-alert">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <a href="https://radar.weather.gov/ridge/radar.php?rid=dox" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!-- CHANGEME: - RADAR LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;DOVER
                                    NWS RADAR PAGE
                                </a>
                            </div>
                        </div>
                        <div id="RadMd11" class="w3-display-container RadMd" style="display:none">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRadMd" onclick="openRadMd(event,'RadMd0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>
                            <div class="w3-container">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/standard/N0Z/DOX_0.png" alt="Local Radar" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                            <div class="w3-alert">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <a href="https://radar.weather.gov/ridge/radar.php?rid=dox" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!-- CHANGEME: - RADAR LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;DOVER
                                    NWS RADAR PAGE
                                </a>
                            </div>
                        </div>
                        <div id="RadMd12" class="w3-display-container RadMd" style="display:none">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRadMd" onclick="openRadMd(event,'RadMd0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>
                            <div class="w3-container">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/standard/N0Z/DOX_loop.gif" alt="Local Radar Loop" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                            <div class="w3-alert">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <a href="https://radar.weather.gov/ridge/radar.php?rid=dox" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!-- CHANGEME: - RADAR LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;DOVER
                                    NWS RADAR PAGE
                                </a>
                            </div>
                        </div>
                    </div>

                    <!-- RADAR IMAGES 4 -->
                    <div id="Radar_Images_4_Md" class="">
                        <div id="RadMd13" class="w3-display-container RadMd" style="display:none">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRadMd" onclick="openRadMd(event,'RadMd0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>
                            <div class="w3-container">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/standard/N0R/DIX_0.png" alt="Local Radar" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                            <div class="w3-alert">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <a href="https://radar.weather.gov/ridge/radar.php?rid=dix" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!-- CHANGEME: - RADAR LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;MT HOLLY
                                    NWS RADAR PAGE
                                </a>
                            </div>
                        </div>
                        <div id="RadMd14" class="w3-display-container RadMd" style="display:none">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRadMd" onclick="openRadMd(event,'RadMd0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>
                            <div class="w3-container">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/standard/N0R/DIX_loop.gif" alt="Local Radar Loop" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                            <div class="w3-alert">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <a href="https://radar.weather.gov/ridge/radar.php?rid=dix" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!-- CHANGEME: - RADAR LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;MT HOLLY
                                    NWS RADAR PAGE
                                </a>
                            </div>
                        </div>
                        <div id="RadMd15" class="w3-display-container RadMd" style="display:none">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRadMd" onclick="openRadMd(event,'RadMd0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>
                            <div class="w3-container">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/standard/N0Z/DIX_0.png" alt="Local Radar" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                            <div class="w3-alert">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <a href="https://radar.weather.gov/ridge/radar.php?rid=dix" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!-- CHANGEME: - RADAR LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;MT HOLLY
                                    NWS RADAR PAGE
                                </a>
                            </div>
                        </div>
                        <div id="RadMd16" class="w3-display-container RadMd" style="display:none">
                            <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRadMd" onclick="openRadMd(event,'RadMd0')" style="cursor:pointer;">
                                <i class="fas fa-times-circle fa-2x"></i>
                            </div>
                            <div class="w3-container">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/standard/N0Z/DIX_loop.gif" alt="Local Radar Loop" style="width:100%; max-width:550px;" class="lazyload">
                            </div>
                            <div class="w3-alert">
                                <!-- CHANGEME: - RADAR LOCATION -->
                                <a href="https://radar.weather.gov/ridge/radar.php?rid=dix" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand">
                                    <!-- CHANGEME: - RADAR LOCATION --><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;MT HOLLY
                                    NWS RADAR PAGE
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>

        <!-- LOCAL_IMPACTS: -->
        <!-- LOCAL - MEDIUM -->
        <div id="LocalMd" class="w3-container w3-white w3-border-2 w3-border-indigo w3-padding StormMd" style="border-radius: 20px; display:none; margin-bottom: 20px;">

            <div class="w3-row">
                <div class="w3-col w3-left w3-alert altfont" style="width:25%;">
                    <div class="w3-alert w3-bar w3-bar-block altfont">
                        <div class="w3-alert w3-large w3-padding w3-padding w3-text-indigo w3-bold" style="text-decoration: underline;">IMPACT GRAPHICS
                        </div>
                        <button class="w3-hide tablinkLocalMd" onclick="openLocalMd(event,'LocalMd0')">&nbsp;</button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkLocalMd" onclick="openLocalMd(event,'LocalMd1')">KEY MESSAGES</button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkLocalMd" onclick="openLocalMd(event,'LocalMd2')">MENSAJES
                            CLAVE</button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkLocalMd" onclick="openLocalMd(event,'LocalMd3')">RAINFALL
                            POTENTIAL</button>

                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkLocalMd" onclick="openLocalMd(event,'LocalMd4')">DAY ONE
                            EXCESSIVE
                            RAINFALL</button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkLocalMd" onclick="openLocalMd(event,'LocalMd5')">DAY TWO
                            EXCESSIVE
                            RAINFALL</button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkLocalMd" onclick="openLocalMd(event,'LocalMd6')">DAY THREE
                            EXCESSIVE
                            RAINFALL</button>

                        <!-- CHANGEME: - STORM NUMBER -->
                        <a href="https://www.nhc.noaa.gov/refresh/graphics_at2+shtml/025509.shtml?inundation#contents" target="_blank" class="w3-bar-item w3-button w3-regular w3-round-large">POTENTIAL STORM SURGE FLOODING</a>

                        <!-- CHANGEME: - STORM NUMBER -->
                        <a href="https://www.nhc.noaa.gov/refresh/graphics_at2+shtml/025509.shtml?wsurge#contents" target="_blank" class="w3-bar-item w3-button w3-regular w3-round-large">STORM SURGE WATCHES &amp; WARNINGS</a>
                    </div>
                </div>

                <div class="w3-col w3-right w3-alert" style="width:25%">
                    <div class="w3-alert w3-bar w3-bar-block altfont">
                        <div class="w3-alert w3-right-align w3-large w3-padding w3-padding w3-text-indigo w3-bold" style="text-decoration: underline;">LOCAL NWS OFFICES
                        </div>
                        <!-- OFFICE #1 -->
                        <div class="w3-alert w3-bottombar">
                            <div class="w3-bar-item w3-button w3-bold w3-right-align w3-regular w3-round-large">
                                <!--CHANGEME: NWS LOCATION -->
                                <a href="https://www.weather.gov/phi" target="_blank">PHILADELPHIA</a>
                            </div>
                            <div class="w3-bar-item w3-button w3-right-align w3-regular w3-round-large">
                                <!--CHANGEME: NWS LOCATION -->
                                <a href="https://www.weather.gov/phi/Tropical" target="_blank">LOCAL IMPACTS PAGE</a>
                            </div>
                        </div>

                        <!-- CHANGEME: OFFICE #2 - w3-hide WHEN NOT IN USE -->
                        <div class="w3-alert w3-bottombar">
                            <div class="w3-bar-item w3-button w3-bold w3-right-align w3-regular w3-round-large">
                                <!--CHANGEME: NWS LOCATION -->
                                <a href="https://www.weather.gov/okx" target="_blank">NEW YORK</a>
                            </div>
                            <div class="w3-bar-item w3-button w3-right-align w3-regular w3-round-large">
                                <!--CHANGEME: NWS LOCATION -->
                                <a href=" https://www.weather.gov/okx/tropical?office=mlb" target="_blank">LOCAL IMPACTS PAGE</a>
                            </div>
                        </div>

                        <!-- CHANGEME: OFFICE #3 - w3-hide WHEN NOT IN USE  -->
                        <div class="w3-alert w3-bottombar w3-hide">
                            <div class="w3-bar-item w3-button w3-bold w3-right-align w3-regular w3-round-large">
                                <!--CHANGEME: NWS LOCATION -->
                                <a href="https://www.weather.gov/mfl" target="_blank">WAKEFIELD</a>
                            </div>
                            <div class="w3-bar-item w3-button w3-right-align w3-regular w3-round-large">
                                <!--CHANGEME: NWS LOCATION -->
                                <a href=" https://www.weather.gov/srh/tropical?office=mfl" target="_blank">LOCAL IMPACTS PAGE</a>
                            </div>
                        </div>

                        <!-- CHANGEME: OFFICE #4 - w3-hide WHEN NOT IN USE  -->
                        <div class="w3-alert w3-hide">
                            <div class="w3-bar-item w3-button w3-bold w3-right-align w3-regular w3-round-large">
                                <!--CHANGEME: NWS LOCATION -->
                                <a href="https://www.weather.gov/tbw" target="_blank">RALEIGH</a>
                            </div>
                            <div class="w3-bar-item w3-button w3-right-align w3-regular w3-round-large">
                                <!--CHANGEME: NWS LOCATION -->
                                <a href=" https://www.weather.gov/srh/tropical?office=tbw" target="_blank">LOCAL IMPACTS PAGE</a>
                            </div>
                        </div>

                    </div>
                </div>

                <div class="w3-rest w3-center w3-alert">
                    <div id="LocalMd0" class="w3-container LocalMd">
                        <img src="images/blank.gif" data-src="../images/sat_card.gif" alt="Placecard" style="width:100%; max-width:400px;" class="lazyload">
                    </div>

                    <div id="LocalMd1" class="w3-display-container LocalMd" style="display:none">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkLocalMd" onclick="openLocalMd(event,'LocalMd0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>
                        <div class="w3-alert">
                            <img src="images/blank.gif" data-src="https://www.nhc.noaa.gov/storm_graphics/AT02/AL022024_key_messages.png" alt="NHC Key Messages" style="width:100%; max-width:600px;" class=" lazyload">
                        </div>
                        <div>
                            <a href="https://www.nhc.noaa.gov" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                        </div>
                    </div>

                    <div id="LocalMd2" class="w3-display-container LocalMd" style="display:none">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkLocalMd" onclick="openLocalMd(event,'LocalMd0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <!-- CHANGEME: - STORM NUMBER -->
                        <div class="w3-alert">
                            <img src="images/blank.gif" data-src="https://www.nhc.noaa.gov/storm_graphics/AT02/AL022024_spanish_key_messages.png" alt="NHC Key Messages in Espanol" style="width:100%; max-width:600px;" class=" lazyload">
                        </div>
                        <div>
                            <a href="https://www.nhc.noaa.gov" target="_blank" class="w3-button w3-indigo w3-TINY w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                        </div>
                    </div>

                    <div id="LocalMd3" class="w3-display-container LocalMd" style="display:none">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkLocalMd" onclick="openLocalMd(event,'LocalMd0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <!-- CHANGEME: - STORM NUMBER -->
                        <div class="w3-alert">
                            <img src="images/blank.gif" data-src="https://www.nhc.noaa.gov/storm_graphics/AT02/AL0220WPCQPF.gif" alt="NHC Rainfall Potential" style="width:100%; max-width:600px;" class=" lazyload">
                        </div>
                        <div>
                            <a href="https://www.nhc.noaa.gov" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                        </div>
                    </div>

                    <div id="LocalMd4" class="w3-display-container LocalMd" style="display:none">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkLocalMd" onclick="openLocalMd(event,'LocalMd0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <img src="images/blank.gif" data-src="https://www.wpc.ncep.noaa.gov/qpf/94ewbg.gif" alt="WPC Day 1 Excessive Rainfall" style="width:100%; max-width:600px;" class="lazyload">
                        <div>
                            <a href="https://www.wpc.ncep.gov" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;WEATHER PREDICTION CENTER</a>
                        </div>
                    </div>

                    <div id="LocalMd5" class="w3-display-container LocalMd" style="display:none">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkLocalMd" onclick="openLocalMd(event,'LocalMd0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>

                        <img src="images/blank.gif" data-src="https://www.wpc.ncep.noaa.gov/qpf/98ewbg.gif" alt="WPC Day 2 Excessive Rainfall" style="width:100%; max-width:600px;" class="lazyload">
                        <div>
                            <a href="https://www.wpc.ncep.gov" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;WEATHER PREDICTION CENTER</a>
                        </div>
                    </div>

                    <div id="LocalMd6" class="w3-display-container LocalMd" style="display:none">
                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkLocalMd" onclick="openLocalMd(event,'LocalMd0')" style="cursor:pointer;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>
                        <img src="images/blank.gif" data-src="https://www.wpc.ncep.noaa.gov/qpf/99ewbg.gif" alt="WPC Day 3 Excessive Rainfall" style="width:100%; max-width:600px;" class="lazyload">
                        <div>
                            <a href="https://www.wpc.ncep.gov" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;WEATHER PREDICTION CENTER</a>
                        </div>
                    </div>


                </div>
            </div>

        </div>

        <!-- Copyright and Social Media - MEDIUM -->
        <div class="w3-container w3-padding w3-center" style="margin-bottom:5px;">
            <div class="w3-alert">
                <a href="https://www.facebook.com/nchurricane" target="_blank">
                    <img src="images/blank.gif" data-src="../images/fb.png" alt="Facebook" class="w3-image lazyload" style="max-width:40px; text-decoration: none">
                </a>
                <a href="https://twitter.com/chuckcopelandwx" target="_blank">
                    <img src="images/blank.gif" data-src="../images/tw.png" alt="Twitter" class="w3-image lazyload" style="max-width:40px; text-decoration: none">
                </a>
                <a href="https://www.instagram.com/chuck_copeland_wx/" target="_blank">
                    <img src="images/blank.gif" data-src="../images/ig.png" alt="Instagram" class="w3-image lazyload" style="max-width:40px; text-decoration: none">
                </a>
                <a href="https://www.youtube.com/@nchurricane" target="_blank">
                    <img src="images/blank.gif" data-src="../images/yt.png" alt="YouTube" class="w3-image lazyload" style="max-width:40px; text-decoration: none">
                </a>
                <a href="mailto:admin@nchurricane.com">
                    <img src="images/blank.gif" data-src="../images/email.png" alt="EMail" class="w3-image lazyload" style="max-width:40px; text-decoration: none">
                </a>
            </div>
            <div class="w3-container w3-padding" style="padding-bottom:5px; margin-top:10px;">
                <div class="w3-alert w3-tiny w3-center">
                    NCHurricane.com is for informative purposes only. Do not use the
                    information on this site to make decisions regarding protecting your
                    life and⁄or personal property. Rely only on information from official
                    sources of information, such as your local NWS office, the NHC, and
                    your local AMS certified meteorologists to make such decisions in a
                    severe weather event.
                </div>
            </div>
            <div class="w3-container w3-padding" style="padding-bottom:5px;">
                <div class="w3-alert w3-tiny w3-center">
                    Copyright &copy;>2003, 2024 NCHurricane. Website design by Chuck
                    Copeland.
                </div>
            </div>
        </div>
    </div>

    <!-- SMALL CONTENT -->
    <!-- ADJUST FOR SMALL SCREENS -->
    <div id="Small_Content" class="w3-hide-large w3-hide-medium" style="margin-top:5px;">

        <!-- CURRENT - SMALL -->
        <div id="Current_Small" class="w3-container w3-border-2 w3-border-red w3-pale-yellow w3-round-xlarge w3-shadow-bottom" style="margin-bottom:10px;padding: 1px;">
            <div class="w3-row">
                <div class="w3-col w3-center">
                    <div class="w3-text-indigo w3-padding w3-small w3-text-black altfont">

                        <!-- CHANGEME: - CATEGORY - IF Hurricane -->
                        <div class="w3-bottombar" style="padding-bottom: 5px;">
                            <!-- <div class="w3-regular w3-text-red w3-bold"><?php echo $system02->systemSaffirSimpsonCategory; ?>
                            </div> -->
                            <div class="w3-container w3-bold w3-center w3-large w3-text-indigo altfont" style="padding-bottom:3px;">
                                <!-- CHANGEME: - STORM NUMBER -->
                                <?php echo $system02->systemType; ?>
                                <?php echo $system02->systemName; ?>
                            </div>
                        </div>
                        <div style="padding-top: 5px;">
                            <!-- CHANGEME: - STORM NUMBER -->
                            <div class="w3-text-black">Location:&nbsp;&nbsp;
                                <?php echo $system02->centerLocLatitude; ?>N&nbsp;
                                <?php echo $system02->centerLocLongitude; ?>W
                            </div>
                        </div>
                        <div>
                            <!-- CHANGEME: - STORM NUMBER -->
                            <div class="w3-text-black">Maximum Sustained Winds:&nbsp;&nbsp;
                                <?php echo $system02->systemIntensityMph; ?> MPH
                            </div>
                        </div>
                        <div>
                            <!-- CHANGEME: - STORM NUMBER -->
                            <div class="w3-text-black">Minimum Central Pressure:&nbsp;&nbsp;
                                <?php echo $system02->systemMslpMb; ?> mb
                            </div>
                        </div>
                        <div>
                            <!-- CHANGEME: - STORM NUMBER -->
                            <div class="w3-text-black">Moving:&nbsp;&nbsp;
                                <?php echo $system02->systemDirectionOfMotion; ?>&nbsp;at&nbsp;
                                <?php echo $system02->systemSpeedMph; ?>&nbsp;MPH
                            </div>
                        </div>
                        <br>
                        <div class="w3-bottombar">
                            <!-- CHANGEME: - STORM NUMBER -->
                            <div class="w3-text-black">THE CENTER OF
                                <?php echo $system02->systemType; ?>
                                <?php echo $system02->systemName; ?>&nbsp;IS:<br>
                                <div class="w3-small">
                                    &nbsp;<?php echo $system02->systemGeoRefPt1; ?><br>
                                    &nbsp;<?php echo $system02->systemGeoRefPt2; ?>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="w3-col w3-center">
                    <div class="w3-row">
                        <div class="w3-col w3-padding">

                            <!-- CHANGEME: - STORM NUMBER -->
                            <img src="images/blank.gif" data-src="https://www.nhc.noaa.gov/storm_graphics/AT02/AL022024_5day_cone_no_line_and_wind.png" alt="NHC 5 Day Track" style="max-width: 300px;" class="lazyload w3-image w3-border w3-border-gray w3-round"><br>
                        </div>
                        <div class="w3-alert w3-small altfont">
                            FIVE DAY TRACK - NHC
                        </div>
                    </div>
                    <div class="w3-container">
                        <a href="https://www.nhc.noaa.gov" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;&nbsp;NATIONAL HURRICANE CENTER</a>
                    </div>
                </div>
            </div>
        </div>

        <!-- GRAPHICS - SMALL -->
        <div id="Graphics_Small">
            <div class="w3-container w3-bold w3-large w3-text-indigo altfont" style="margin-bottom:3px;">
                NHC GRAPHICS
            </div>
            <div class="w3-container w3-white w3-border w3-border-black w3-round-xlarge w3-shadow-bottom" style="margin-bottom:10px;padding: 1px;">
                <div class="w3-container w3-center w3-bold" style="padding:8px;">
                    <div class="w3-bar w3-bottombar">
                        <button class="w3-bar-item w3-hide tablinkGraphicSm" onclick="openGraphicSm(event,'GraphicSm0')">
                        </button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkGraphicSm" onclick="openGraphicSm(event,'GraphicSm1')" style="padding:8px;">
                            3-DAY
                        </button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkGraphicSm" onclick="openGraphicSm(event,'GraphicSm2')" style="padding:8px;">
                            5-DAY
                        </button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkGraphicSm" onclick="openGraphicSm(event,'GraphicSm3')" style="padding:8px;">
                            TS WINDS
                        </button>
                    </div>
                </div>

                <div id="GraphicSm0" class="w3-container w3-regular w3-center GraphicSm altfont w3-text-grey" style="padding: 0 10px 10px;">
                    CLICK LINKS ABOVE TO DISPLAY IMAGES
                </div>

                <div id="GraphicSm1" class="w3-display-container w3-center GraphicSm" style="display:none;padding: 0 10px 10px;">

                    <!-- CHANGEME: - STORM NUMBER -->
                    <img src="images/blank.gif" data-src="https://www.nhc.noaa.gov/storm_graphics/AT02/AL022024_3day_cone_no_line_and_wind.png" alt="NHC 3 Day Track" style="width:100%; max-width:500px;" class="lazyload">

                    <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkGraphicSm" onclick="openGraphicSm(event,'GraphicSm0')" style="cursor:pointer; margin: 1px 10px;">
                        <i class="fas fa-times-circle fa-2x"></i>
                    </div>

                    <div class="w3-container">
                        <!-- CHANGEME: - STORM NUMBER -->
                        <a href="https://www.nhc.noaa.gov/refresh/graphics_at2+shtml/" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>
                            &nbsp;&nbsp;NHC STORM GRAPHICS</a>
                    </div>
                </div>

                <div id="GraphicSm2" class="w3-display-container w3-center w3-small GraphicSm" style="display:none; padding: 0 10px 10px;">

                    <!-- CHANGEME: - STORM NUMBER -->
                    <img src="images/blank.gif" data-src="https://www.nhc.noaa.gov/storm_graphics/AT02/AL022024_5day_cone_no_line_and_wind.png" alt="NHC 5 Day Track" style="width:100%; max-width:500px;" class="lazyload">

                    <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkGraphicSm" onclick="openGraphicSm(event,'GraphicSm0')" style="cursor:pointer; margin: 1px 10px;">
                        <i class="fas fa-times-circle fa-2x"></i>
                    </div>

                    <div class="w3-container">
                        <!-- CHANGEME: - STORM NUMBER -->
                        <a href="https://www.nhc.noaa.gov/refresh/graphics_at2+shtml/" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>
                            <!-- CHANGEME: - STORM NUMBER -->
                            &nbsp;&nbsp;NHC STORM GRAPHICS</a>
                    </div>
                </div>

                <div id="GraphicSm3" class="w3-display-container w3-center w3-small GraphicSm" style="display:none; padding: 0 10px 10px;">

                    <!-- CHANGEME: - STORM NUMBER -->
                    <img src="images/blank.gif" data-src="https://www.nhc.noaa.gov/storm_graphics/AT02/AL022024_wind_probs_50_F120.png" alt="NHC 50 Knot Winds Probability" style="width:100%; max-width:900px;" class="lazyload">

                    <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkGraphicSm" onclick="openGraphicSm(event,'GraphicSm0')" style="cursor:pointer; margin: 1px 10px;">
                        <i class="fas fa-times-circle fa-2x"></i>
                    </div>

                    <div class="w3-container">
                        <!-- CHANGEME: - STORM NUMBER -->
                        <a href="https://www.nhc.noaa.gov/refresh/graphics_at2+shtml/" target="_blank" class="w3-button w3-indigo w3-tiny w3-margin w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>

                            <!-- CHANGEME: - STORM NUMBER -->&nbsp;&nbsp;NHC STORM GRAPHICS</a>
                    </div>
                </div>
            </div>
        </div>

        <!-- TEXT - SMALL -->
        <div id="Text_Small">
            <div class="w3-container w3-bold w3-large w3-text-indigo altfont" style="margin-bottom:3px;">
                NHC TEXT PRODUCTS
            </div>
            <div class="w3-container w3-border w3-border-black w3-white w3-round-xlarge w3-shadow-bottom" style="margin-bottom:10px;padding: 1px;">
                <div class="w3-container w3-center" style="padding:8px 6px;">
                    <div class="w3-bar w3-bottombar w3-bold">
                        <button class="w3-bar-item w3-hide tablinkTextSm" onclick="openTextSm(event,'TextSm0')" style="padding:8px 10px;"></button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkTextSm" onclick="openTextSm(event,'TextSm1')" style="padding:8px 10px;">
                            PUBLIC
                        </button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkTextSm" onclick="openTextSm(event,'TextSm2')" style="padding:8px 10px;">
                            FORECAST
                        </button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkTextSm" onclick="openTextSm(event,'TextSm3')" style="padding:8px 10px;">
                            DISCUSSION
                        </button>
                    </div>
                </div>

                <div id="TextSm0" class="w3-container w3-regular TextSm w3-center altfont w3-text-grey" style="padding: 0 10px 10px;">
                    CLICK LINKS ABOVE TO DISPLAY TEXT PRODUCTS
                </div>

                <div id="TextSm1" class="w3-alert w3-small TextSm" style="display:none; padding: 0 10px 10px;">
                    <div class="w3-container w3-center">
                        <!-- CHANGEME: - STORM NUMBER -->
                        <a href="https://www.nhc.noaa.gov/text/refresh/MIATCPAT2+shtml/" target="_blank" class="w3-button w3-indigo w3-tiny w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>
                            &nbsp;&nbsp;NHC SYSTEM ADVISORY</a>
                    </div>
                    <div class="w3-display-container">
                        <!-- CHANGEME: - STORM NUMBER -->
                        <?php
                        $pub7 = simplexml_load_file("../xml/02_public.xml");
                        echo $pub7->channel->item->description;
                        ?>

                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkTextSm" onclick="openTextSm(event,'TextSm0')" style="cursor:pointer; margin: 10px;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>
                    </div>
                </div>

                <div id="TextSm2" class="w3-alert w3-small TextSm" style="display:none; padding: 0 10px 10px;">
                    <div class="w3-container w3-center">
                        <!-- CHANGEME: - STORM NUMBER -->
                        <a href="https://www.nhc.noaa.gov/text/refresh/MIATCMAT2+shtml/" target="_blank" class="w3-button w3-indigo w3-tiny w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>
                            &nbsp;&nbsp;NHC SYSTEM FORECAST</a>
                    </div>
                    <div class="w3-display-container">
                        <!-- CHANGEME: - STORM NUMBER -->
                        <?php
                        $pub7 = simplexml_load_file("../xml/02_forecast.xml");
                        echo $pub7->channel->item->description;
                        ?>

                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkTextSm" onclick="openTextSm(event,'TextSm0')" style="cursor:pointer; margin: 10px;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>
                    </div>
                </div>

                <div id="TextSm3" class="w3-alert w3-small TextSm" style="display:none; padding: 0 10px 10px;">
                    <div class="w3-container w3-center">
                        <!-- CHANGEME: - STORM NUMBER -->
                        <a href="https://www.nhc.noaa.gov/text/refresh/MIATCDAT2+shtml/" target="_blank" class="w3-button w3-indigo w3-tiny w3-padding w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>
                            &nbsp;&nbsp;NHC SYSTEM DISCUSSION</a>
                    </div>
                    <div class="w3-display-container">
                        <!-- CHANGEME: - STORM NUMBER -->
                        <?php
                        $pub7 = simplexml_load_file("../xml/02_discussion.xml");
                        echo $pub7->channel->item->description;
                        ?>

                        <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkTextSm" onclick="openTextSm(event,'TextSm0')" style="cursor:pointer; margin: 10px;">
                            <i class="fas fa-times-circle fa-2x"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- SATELLITES - SMALL -->
        <div id="Satellite_Small">
            <div class="w3-container w3-bold w3-large w3-text-indigo altfont" style="margin-bottom:3px;">
                GOES-EAST SATELLITE
            </div>
            <div class="w3-container w3-border w3-border-black w3-white w3-round-xlarge w3-shadow-bottom" style="margin-bottom:10px;padding: 1px;">
                <div class="w3-container w3-center" style="padding:8px 7px;">
                    <div class="w3-bar w3-bottombar w3-bold">
                        <button class="w3-bar-item w3-hide tablinkSatSm" onclick="openSatSm(event,'SatSm0')" style="padding:8px 10px;"></button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkSatSm" onclick="openSatSm(event,'SatSm1')" style="padding:8px;">
                            INFRARED
                        </button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkSatSm" onclick="openSatSm(event,'SatSm2')" style="padding:8px;">
                            VISIBLE
                        </button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkSatSm" onclick="openSatSm(event,'SatSm3')" style="padding:8px;">
                            W VAPOR
                        </button>
                        <button class="w3-bar-item w3-button w3-regular w3-round-large tablinkSatSm" onclick="openSatSm(event,'SatSm4')" style="padding:8px;">
                            GEOCOLOR
                        </button>
                    </div>
                </div>

                <div id="SatSm0" class="w3-container w3-regular SatSm w3-center altfont w3-text-grey" style="padding: 0 10px 10px;">
                    CLICK LINKS ABOVE TO DISPLAY IMAGES
                </div>

                <div id="SatSm1" class="w3-display-container w3-center w3-small SatSm" style="display:none; padding: 0 10px 10px;">

                    <!-- CHANGEME: - STORM NUMBER -->
                    <!-- CHANGEME: - w3-hide WHEN NO FLOATERS ARE ACTIVE -->
                    <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/FLOATER/data/AL022024/13/500x500.jpg" alt="Floater Satellite" style="width:100%; max-width:500px;" class="lazyload">

                    <!-- CHANGEME: - w3-hide WHEN FLOATERS ARE ACTIVE -->
                    <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/taw/13/1800x1080.jpg" alt="Regional Satellite" style="width:100%; max-width:500px;" class="lazyload w3-hide"><!-- CHANGEME: REGIONAL LOCATION -->

                    <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSatSm" onclick="openSatSm(event,'SatSm0')" style="cursor:pointer; margin: 1px 10px;">
                        <i class="fas fa-times-circle fa-2x"></i>
                    </div>

                    <!-- CHANGEME: - STORM NUMBER -->
                    <div class="w3-container w3-center">
                        <a href="https://www.star.nesdis.noaa.gov/GOES/floater.php?stormid=AL022024" target="_blank" class="w3-button w3-indigo w3-tiny w3-padding w3-margin w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;GOES-EAST STORM PAGE</a>
                    </div>
                </div>

                <div id="SatSm2" class="w3-display-container w3-center w3-small SatSm" style="display:none; padding: 0 10px 10px;">

                    <!-- CHANGEME: - STORM NUMBER -->
                    <!-- CHANGEME: - w3-hide WHEN NO FLOATERS ARE ACTIVE -->
                    <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/FLOATER/data/AL022024/02/500x500.jpg" alt="Floater Satellite" style="width:100%; max-width:500px;" class="lazyload">

                    <!-- CHANGEME: - w3-hide WHEN FLOATER ARE ACTIVE -->
                    <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/taw/02/1800x1080.jpg" alt="Regional Satellite" style="width:100%; max-width:500px;" class="lazyload w3-hide"><!-- CHANGEME: REGIONAL LOCATION -->

                    <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSatSm" onclick="openSatSm(event,'SatSm0')" style="cursor:pointer; margin: 1px 10px;">
                        <i class="fas fa-times-circle fa-2x"></i>
                    </div>

                    <!-- CHANGEME: - STORM NUMBER -->
                    <div class="w3-container w3-center">
                        <a href="https://www.star.nesdis.noaa.gov/GOES/floater.php?stormid=AL022024" target="_blank" class="w3-button w3-indigo w3-tiny w3-padding w3-margin w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;GOES-EAST STORM
                            PAGE</a>
                    </div>
                </div>

                <div id="SatSm3" class="w3-display-container w3-center w3-small SatSm" style="display:none; padding: 0 10px 10px;">

                    <!-- CHANGEME: - STORM NUMBER -->
                    <!-- CHANGEME: - w3-hide WHEN NO FLOATERS ARE ACTIVE -->
                    <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/FLOATER/data/AL022024/08/500x500.jpg" alt="Floater Satellite" style="width:100%; max-width:500px;" class="lazyload">

                    <!-- CHANGEME: - w3-hide WHEN FLOATERS ARE ACTIVE -->
                    <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/taw/08/1800x1080.jpg" alt="Regional Satellite" style="width:100%; max-width:500px;" class="lazyload w3-hide"><!-- CHANGEME: REGIONAL LOCATION -->

                    <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSatSm" onclick="openSatSm(event,'SatSm0')" style="cursor:pointer; margin: 1px 10px;">
                        <i class="fas fa-times-circle fa-2x"></i>
                    </div>

                    <!-- CHANGEME: - STORM NUMBER -->
                    <div class="w3-container w3-center">
                        <a href="https://www.star.nesdis.noaa.gov/GOES/floater.php?stormid=AL022024" target="_blank" class="w3-button w3-indigo w3-tiny w3-padding w3-margin w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;GOES-EAST STORM
                            PAGE</a>
                    </div>
                </div>

                <div id="SatSm4" class="w3-display-container w3-center w3-small SatSm" style="display:none; padding: 0 10px 10px;">

                    <!-- CHANGEME: - STORM NUMBER -->
                    <!-- CHANGEME: - w3-hide WHEN NO FLOATERS ARE ACTIVE -->
                    <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/FLOATER/data/AL022024/GEOCOLOR/500x500.jpg" alt="Floater Satellite" style="width:100%; max-width:500px;" class="lazyload">

                    <!-- CHANGEME: - w3-hide WHEN FLOATERS ARE ACTIVE -->
                    <img src="images/blank.gif" data-src="https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/taw/GEOCOLOR/1800x1080.jpg" alt="Regional Satellite" style="width:100%; max-width:500px;" class="lazyload w3-hide"><!-- CHANGEME: REGIONAL LOCATION -->

                    <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkSatSm" onclick="openSatSm(event,'SatSm0')" style="cursor:pointer; margin: 1px 10px;">
                        <i class="fas fa-times-circle fa-2x"></i>
                    </div>

                    <!-- CHANGEME: - STORM NUMBER -->
                    <div class="w3-container w3-center">
                        <a href="https://www.star.nesdis.noaa.gov/GOES/floater.php?stormid=AL022024" target="_blank" class="w3-button w3-indigo w3-tiny w3-padding w3-margin w3-border w3-border-gray w3-round-large w3-text-sand"><i class="fas fa-external-link-alt"></i>&nbsp;GOES-EAST STORM
                            PAGE</a>
                    </div>
                </div>
            </div>
        </div>

        <!-- LOCAL_IMPACTS: -->
        <!-- RADARS - SMALL -->
        <!-- CHANGEME: - w3-hide WHEN NOT IN USE -->
        <div class="w3-hide">
            <div class="w3-container w3-bold w3-large w3-text-indigo altfont" style="margin-bottom:3px;">
                LOCAL RADAR IMAGES
            </div>
            <div class="w3-container w3-border w3-border-black w3-white w3-round-xlarge w3-shadow-bottom" style="margin-bottom:10px;padding: 1px;">
                <div class="w3-container w3-center" style="padding:8px;">
                    <div class="w3-bar w3-bottombar w3-bold">
                        <button class="w3-bar-item w3-hide tablinkRadSm" onclick="openRadSm(event,'RadSm0')" style="padding:8px 10px;"></button>
                        <button class="w3-bar-item w3-button w3-small w3-round-large tablinkRadSm" onclick="openRadSm(event,'RadSm1')" style="padding:8px 10px;">
                            <!-- CHANGEME: - RADAR LOCATION -->
                            NEUS
                        </button>
                        <button class="w3-bar-item w3-button w3-small w3-round-large tablinkRadSm" onclick="openRadSm(event,'RadSm2')" style="padding:8px 10px;">
                            <!-- CHANGEME: - RADAR LOCATION -->
                            WAKEFIELD
                        </button>
                        <button class="w3-bar-item w3-button w3-small w3-round-large tablinkRadSm" onclick="openRadSm(event,'RadSm3')" style="padding:8px 10px;">
                            <!-- CHANGEME: - RADAR LOCATION -->
                            DOVER
                        </button>
                        <button class="w3-bar-item w3-button w3-small w3-round-large tablinkRadSm" onclick="openRadSm(event,'RadSm4')" style="padding:8px 10px;">
                            <!-- CHANGEME: - RADAR LOCATION -->
                            MT HOLLY
                        </button>
                    </div>
                </div>

                <div id="RadSm0" class="w3-container w3-small RadSm w3-center altfont w3-text-grey" style="padding: 0 10px 10px;">
                    CLICK LINKS ABOVE TO DISPLAY IMAGES
                </div>

                <div id="RadSm1" class="w3-display-container w3-center w3-small RadSm" style="display:none; padding: 0 10px 10px;">

                    <!-- CHANGEME: - REGIONAL LOCATION -->
                    <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/Conus/Loop/northeast_loop.gif" alt="Regional Radar Loop" style="width:100%; max-width:500px;" class="lazyload">

                    <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRadSm" onclick="openRadSm(event,'RadSm0')" style="cursor:pointer; margin: 1px 10px;">
                        <i class="fas fa-times-circle fa-2x"></i>
                    </div>

                    <div class="w3-alert">
                        <a href="https://radar.weather.gov/" target="_blank" class="w3-button w3-indigo w3-tiny w3-padding w3-margin w3-border w3-border-gray w3-round-large w3-text-sand">
                            <i class="fas fa-external-link-alt"></i>&nbsp;MIAMI
                            FL NWS RADAR PAGE</a>
                    </div>
                </div>

                <div id="RadSm2" class="w3-display-container w3-center w3-small RadSm" style="display:none; padding: 0 10px 10px;">

                    <!-- CHANGEME: - RADAR LOCATION -->
                    <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/standard/N0R/AKQ_loop.gif" alt="NWS Radar Loop" style="width:100%; max-width:500px;" class="lazyload">

                    <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRadSm" onclick="openRadSm(event,'RadSm0')" style="cursor:pointer; margin: 1px 10px;">
                        <i class="fas fa-times-circle fa-2x"></i>
                    </div>

                    <div class="w3-alert">
                        <!-- CHANGEME: - RADAR LOCATION -->
                        <a href="https://radar.weather.gov/ridge/radar.php?rid=akq" target="_blank" class="w3-button w3-indigo w3-tiny w3-padding w3-margin w3-border w3-border-gray w3-round-large w3-text-sand">
                            <!-- CHANGEME: - RADAR LOCATION -->
                            <i class="fas fa-external-link-alt"></i>&nbsp;WAKEFIELD
                            FL NWS RADAR PAGE
                        </a>
                    </div>
                </div>

                <div id="RadSm3" class="w3-display-container w3-center w3-small RadSm" style="display:none; padding: 0 10px 10px;">

                    <!-- CHANGEME: - RADAR LOCATION -->
                    <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/standard/N0R/DOX_loop.gif" alt="NWS Radar Loop" style="width:100%; max-width:500px;" class="lazyload">

                    <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRadSm" onclick="openRadSm(event,'RadSm0')" style="cursor:pointer; margin: 1px 10px;">
                        <i class="fas fa-times-circle fa-2x"></i>
                    </div>

                    <div class="w3-alert">
                        <!-- CHANGEME: - RADAR LOCATION -->
                        <a href="https://radar.weather.gov/ridge/radar.php?rid=dox" target="_blank" class="w3-button w3-indigo w3-tiny w3-padding w3-margin w3-border w3-border-gray w3-round-large w3-text-sand">
                            <!-- CHANGEME: - RADAR LOCATION -->
                            <i class="fas fa-external-link-alt"></i>&nbsp;DOVER
                            FL NWS RADAR PAGE
                        </a>
                    </div>
                </div>

                <div id="RadSm4" class="w3-display-container w3-center w3-small RadSm" style="display:none; padding: 0 10px 10px;">

                    <!-- CHANGEME: - RADAR LOCATION -->
                    <img src="images/blank.gif" data-src="https://radar.weather.gov/ridge/standard/N0R/DIX_loop.gif" alt="NWS Radar Loop" style="width:100%; max-width:500px;" class="lazyload">

                    <div class="w3-display-topright w3-seashell w3-medium w3-text-indigo w3-round-xlarge tablinkRadSm" onclick="openRadSm(event,'RadSm0')" style="cursor:pointer; margin: 1px 10px;">
                        <i class="fas fa-times-circle fa-2x"></i>
                    </div>

                    <div class="w3-alert">
                        <!-- CHANGEME: - RADAR LOCATION -->
                        <a href="https://radar.weather.gov/ridge/radar.php?rid=dix" target="_blank" class="w3-button w3-indigo w3-tiny w3-padding w3-margin w3-border w3-border-gray w3-round-large w3-text-sand">
                            <!-- CHANGEME: - RADAR LOCATION -->
                            <i class="fas fa-external-link-alt"></i>&nbsp;MT HOLLY
                            FL NWS RADAR PAGE
                        </a>
                    </div>
                </div>
            </div>
        </div>

        <!-- LOCAL_IMPACTS: -->
        <!-- LOCAL - SMALL -->
        <div class="w3-hide">
            <div class="w3-container w3-bold w3-large w3-text-indigo altfont" style="margin-bottom:3px;">
                LOCAL IMPACTS
            </div>
            <div class="w3-container w3-border w3-border-black w3-white w3-round-xlarge w3-shadow-bottom" style="margin-bottom:20px;padding: 1px;">
                <div class="w3-container w3-center" style="padding:8px;">
                    <div class="w3-bar w3-bottombar w3-bold">
                        <button class="w3-bar-item w3-hide tablinkLocalSm" onclick="openLocalSm(event,'LocalSm0')" style="padding:8px 10px;"></button>
                        <button class="w3-bar-item w3-button w3-small w3-round-large tablinkLocalSm" onclick="openLocalSm(event,'LocalSm1')" style="padding:8px 10px;">
                            <!--CHANGEME: NWS LOCATION -->
                            PHILADELPHIA
                        </button>
                        <button class="w3-bar-item w3-button w3-small w3-round-large tablinkLocalSm" onclick="openLocalSm(event,'LocalSm2')" style="padding:8px 10px;">
                            <!--CHANGEME: NWS LOCATION -->
                            NEW YORK
                        </button>
                        <button class=" w3-hide w3-bar-item w3-button w3-small w3-round-large tablinkLocalSm" onclick="openLocalSm(event,'LocalSm3')" style="padding:8px 10px;">
                            <!--CHANGEME: NWS LOCATION -->
                            MIAMI
                        </button>
                    </div>
                </div>

                <div id="LocalSm0" class="w3-container w3-small LocalSm w3-center altfont w3-text-grey" style="padding: 0 10px 10px;">
                    CLICK LOCATION ABOVE TO DISPLAY LINKS
                </div>

                <div id="LocalSm1" class="w3-container w3-center w3-small LocalSm" style="display:none; padding: 0 10px 10px;">
                    <!--CHANGEME: NWS LOCATION -->
                    <div class="w3-alert w3-padding w3-button w3-round-large">
                        <a href="https://www.weather.gov/phi" target="_blank">
                            <i class="fas fa-external-link-alt"></i>&nbsp;PHILADELPHIA NWS OFFICE</a>
                    </div>
                    <br>
                    <!--CHANGEME: NWS LOCATION -->
                    <div class="w3-alert w3-padding w3-button w3-round-large">
                        <a href="https://www.weather.gov/phi/tropical" target="_blank">
                            <i class="fas fa-external-link-alt"></i>&nbsp;LOCAL IMPACTS PAGE</a>
                    </div>
                    <br>
                    <div class="w3-button w3-indigo w3-small w3-padding w3-border w3-border-gray w3-round-large w3-text-sand tablinkLocalSm altfont" onclick="openLocalSm(event,'LocalSm0')" style="cursor:pointer;"><i class="fas fa-sort-up"></i>&nbsp;&nbsp;COLLAPSE LIST
                    </div>
                </div>

                <div id="LocalSm2" class="w3-container w3-center w3-small LocalSm" style="display:none; padding: 0 10px 10px;">
                    <!--CHANGEME: NWS LOCATION -->
                    <div class="w3-alert w3-padding w3-button w3-round-large">
                        <a href="https://www.weather.gov/okx" target="_blank">
                            <i class="fas fa-external-link-alt"></i>&nbsp;NEW YORK NWS OFFICE</a>
                    </div>
                    <br>
                    <!--CHANGEME: NWS LOCATION -->
                    <div class="w3-alert w3-padding w3-button w3-round-large">
                        <a href="https://www.weather.gov/okx/tropical" target="_blank">
                            <i class="fas fa-external-link-alt"></i>&nbsp;LOCAL IMPACTS
                            PAGE</a>
                    </div>
                    <br>
                    <div class="w3-button w3-indigo w3-small w3-padding w3-border w3-border-gray w3-round-large w3-text-sand tablinkLocalSm altfont" onclick="openLocalSm(event,'LocalSm0')" style="cursor:pointer;"><i class="fas fa-sort-up"></i>&nbsp;&nbsp;COLLAPSE LIST
                    </div>
                </div>

                <div id="LocalSm3" class="w3-hide w3-container w3-center w3-small LocalSm" style="display:none; padding: 0 10px 10px;">
                    <!--CHANGEME: NWS LOCATION -->
                    <div class="w3-alert w3-padding w3-button w3-round-large">
                        <a href="https://www.weather.gov/amx" target="_blank">
                            <i class="fas fa-external-link-alt"></i>&nbsp;MIAMI NWS OFFICE</a>
                    </div>
                    <br>
                    <!--CHANGEME: NWS LOCATION -->
                    <div class="w3-alert w3-padding w3-button w3-round-large">
                        <a href="https://www.weather.gov/srh/tropical" target="_blank">
                            <i class="fas fa-external-link-alt"></i>&nbsp;LOCAL IMPACTS
                            PAGE</a>
                    </div>
                    <br>
                    <div class="w3-button w3-indigo w3-small w3-padding w3-border w3-border-gray w3-round-large w3-text-sand tablinkLocalSm altfont" onclick="openLocalSm(event,'LocalSm0')" style="cursor:pointer;"><i class="fas fa-sort-up"></i>&nbsp;&nbsp;COLLAPSE LIST
                    </div>
                </div>
            </div>
        </div>

        <!-- Copyright and Social Media - SMALL -->
        <div class="w3-container w3-padding w3-center" style="margin-bottom:5px;">
            <div class="w3-alert">
                <a href="https://www.facebook.com/nchurricane" target="_blank">
                    <img src="images/blank.gif" data-src="../images/fb.png" alt="Facebook" class="w3-image lazyload" style="max-width:35px; text-decoration: none">
                </a>
                <a href="https://twitter.com/chuckcopelandwx" target="_blank">
                    <img src="images/blank.gif" data-src="../images/tw.png" alt="Twitter" class="w3-image lazyload" style="max-width:35px; text-decoration: none">
                </a>
                <a href="https://www.instagram.com/chuck_copeland_wx/" target="_blank">
                    <img src="images/blank.gif" data-src="../images/ig.png" alt="Instagram" class="w3-image lazyload" style="max-width:35px; text-decoration: none">
                </a>
                <a href="https://www.youtube.com/@nchurricane" target="_blank">
                    <img src="images/blank.gif" data-src="../images/yt.png" alt="YouTube" class="w3-image lazyload" style="max-width:35px; text-decoration: none">
                </a>
                <a href="mailto:admin@nchurricane.com">
                    <img src="images/blank.gif" data-src="../images/email.png" alt="EMail" class="w3-image lazyload" style="max-width:35px; text-decoration: none">
                </a>
            </div>
            <div class="w3-container w3-padding" style="margin-bottom:5px; margin-top: 5px;">
                <div class="w3-alert w3-tiny w3-center">
                    NCHurricane.com is for informative purposes only. Do not use the
                    information on this site to make decisions regarding protecting your
                    life and⁄or personal property. Rely only on information from official
                    sources of information, such as your local NWS office, the NHC, and
                    your local AMS certified meteorologists to make such decisions in a
                    severe weather event.
                </div>
            </div>
            <div class="w3-container w3-padding" style="margin-bottom:5px;">
                <div class="w3-alert w3-tiny w3-center">
                    Copyright &copy;>2003, 2024 NCHurricane. Website design by Chuck
                    Copeland.
                </div>
            </div>
        </div>
    </div>

    <!-- SCRIPTS -->
    <div id="Scripts">
        <script src="../scripts/lazysizes.min.js" async=""></script>

        <!-- TOP Script -->
        <script>
            window.onscroll = function() {
                scrollFunction();
            };

            function scrollFunction() {
                if (
                    document.body.scrollTop > 20 ||
                    document.documentElement.scrollTop > 20
                ) {
                    document.getElementById("myBtn").style.display = "block";
                } else {
                    document.getElementById("myBtn").style.display = "none";
                }
            }

            function topFunction() {
                document.body.scrollTop = 0;
                document.documentElement.scrollTop = 0;
            }
        </script>

        <!-- Tab Script - STORM Tabs - Large -->
        <script>
            function openStorm(evt, StormName) {
                var i, x, tablinksStorm;
                x = document.getElementsByClassName("Storm");
                for (i = 0; i < x.length; i++) {
                    x[i].style.display = "none";
                }
                tablinksStorm = document.getElementsByClassName("tablinkStorm");
                for (i = 0; i < x.length; i++) {
                    tablinksStorm[i].className = tablinksStorm[i].className.replace(
                        " w3-red",
                        ""
                    );
                }
                document.getElementById(StormName).style.display = "block";
                evt.currentTarget.className += " w3-red";
            }
        </script>

        <!-- Tab Script - STORM Tabs - Medium -->
        <script>
            function openStormMd(evt, StormMdName) {
                var i, x, tablinksStormMd;
                x = document.getElementsByClassName("StormMd");
                for (i = 0; i < x.length; i++) {
                    x[i].style.display = "none";
                }
                tablinksStormMd = document.getElementsByClassName("tablinkStormMd");
                for (i = 0; i < x.length; i++) {
                    tablinksStormMd[i].className = tablinksStormMd[i].className.replace(
                        " w3-red",
                        ""
                    );
                }
                document.getElementById(StormMdName).style.display = "block";
                evt.currentTarget.className += " w3-red";
            }
        </script>

        <!-- Tab Script - Text - LARGE -->
        <script>
            function openText(evt, TextName) {
                var i, x, tablinksText;
                x = document.getElementsByClassName("Text");
                for (i = 0; i < x.length; i++) {
                    x[i].style.display = "none";
                }
                tablinksText = document.getElementsByClassName("tablinkText");
                for (i = 0; i < x.length; i++) {
                    tablinksText[i].className = tablinksText[i].className.replace(" w3-red", "");
                }
                document.getElementById(TextName).style.display = "block";
                evt.currentTarget.className += " w3-red";
            }
        </script>

        <!-- Tab Script - Text - MEDIUM -->
        <script>
            function openTextMd(evt, TextMdName) {
                var i, x, tablinksTextMd;
                x = document.getElementsByClassName("TextMd");
                for (i = 0; i < x.length; i++) {
                    x[i].style.display = "none";
                }
                tablinksTextMd = document.getElementsByClassName("tablinkTextMd");
                for (i = 0; i < x.length; i++) {
                    tablinksTextMd[i].className = tablinksTextMd[i].className.replace(" w3-red", "");
                }
                document.getElementById(TextMdName).style.display = "block";
                evt.currentTarget.className += " w3-red";
            }
        </script>

        <!-- Tab Script - Text - SMALL -->
        <script>
            function openTextSm(evt, TextSmName) {
                var i, x, tablinksText;
                x = document.getElementsByClassName("TextSm");
                for (i = 0; i < x.length; i++) {
                    x[i].style.display = "none";
                }
                tablinksTextSm = document.getElementsByClassName("tablinkTextSm");
                for (i = 0; i < x.length; i++) {
                    tablinksTextSm[i].className = tablinksTextSm[i].className.replace(" w3-red", "");
                }
                document.getElementById(TextSmName).style.display = "block";
                evt.currentTarget.className += " w3-red";
            }
        </script>

        <!-- Tab Script - Graphics- LARGE -->
        <script>
            function openGraphic(evt, GraphicName) {
                var i, x, tablinksGraphic;
                x = document.getElementsByClassName("Graphic");
                for (i = 0; i < x.length; i++) {
                    x[i].style.display = "none";
                }
                tablinksGraphic = document.getElementsByClassName("tablinkGraphic");
                for (i = 0; i < x.length; i++) {
                    tablinksGraphic[i].className = tablinksGraphic[i].className.replace(" w3-red", "");
                }
                document.getElementById(GraphicName).style.display = "block";
                evt.currentTarget.className += " w3-red";
            }
        </script>

        <!-- Tab Script - Graphics- Medium -->
        <script>
            function openGraphicMd(evt, GraphicMdName) {
                var i, x, tablinksGraphicMd;
                x = document.getElementsByClassName("GraphicMd");
                for (i = 0; i < x.length; i++) {
                    x[i].style.display = "none";
                }
                tablinksGraphicMd = document.getElementsByClassName("tablinkGraphicMd");
                for (i = 0; i < x.length; i++) {
                    tablinksGraphicMd[i].className = tablinksGraphicMd[i].className.replace(" w3-red", "");
                }
                document.getElementById(GraphicMdName).style.display = "block";
                evt.currentTarget.className += " w3-red";
            }
        </script>

        <!-- Tab Script - Graphics- SMALL -->
        <script>
            function openGraphicSm(evt, GraphicSmName) {
                var i, x, tablinksGraphicSm;
                x = document.getElementsByClassName("GraphicSm");
                for (i = 0; i < x.length; i++) {
                    x[i].style.display = "none";
                }
                tablinksGraphicSm = document.getElementsByClassName("tablinkGraphicSm");
                for (i = 0; i < x.length; i++) {
                    tablinksGraphicSm[i].className = tablinksGraphicSm[i].className.replace(" w3-red", "");
                }
                document.getElementById(GraphicSmName).style.display = "block";
                evt.currentTarget.className += " w3-red";
            }
        </script>

        <!-- Tab Script - Satellite - LARGE -->
        <script>
            function openSat(evt, SatName) {
                var i, x, tablinksSat;
                x = document.getElementsByClassName("Sat");
                for (i = 0; i < x.length; i++) {
                    x[i].style.display = "none";
                }
                tablinksSat = document.getElementsByClassName("tablinkSat");
                for (i = 0; i < x.length; i++) {
                    tablinksSat[i].className = tablinksSat[i].className.replace(" w3-red", "");
                }
                document.getElementById(SatName).style.display = "block";
                evt.currentTarget.className += " w3-red";
            }
        </script>


        <!-- Tab Script - Satellite_Alt - LARGE -->
        <script>
            function openSatA(evt, SatAName) {
                var i, x, tablinksSatA;
                x = document.getElementsByClassName("SatA");
                for (i = 0; i < x.length; i++) {
                    x[i].style.display = "none";
                }
                tablinksSatA = document.getElementsByClassName("tablinkSatA");
                for (i = 0; i < x.length; i++) {
                    tablinksSatA[i].className = tablinksSatA[i].className.replace(" w3-red", "");
                }
                document.getElementById(SatAName).style.display = "block";
                evt.currentTarget.className += " w3-red";
            }
        </script>

        <!-- Tab Script - Satellite - Medium -->
        <script>
            function openSatMd(evt, SatMdName) {
                var i, x, tablinksSatMd;
                x = document.getElementsByClassName("SatMd");
                for (i = 0; i < x.length; i++) {
                    x[i].style.display = "none";
                }
                tablinksSatMd = document.getElementsByClassName("tablinkSatMd");
                for (i = 0; i < x.length; i++) {
                    tablinksSatMd[i].className = tablinksSatMd[i].className.replace(" w3-red", "");
                }
                document.getElementById(SatMdName).style.display = "block";
                evt.currentTarget.className += " w3-red";
            }
        </script>

        <!-- Tab Script - Satellite_Alt - Medium -->
        <script>
            function openSatMdA(evt, SatMdAName) {
                var i, x, tablinksSatMdA;
                x = document.getElementsByClassName("SatMdA");
                for (i = 0; i < x.length; i++) {
                    x[i].style.display = "none";
                }
                tablinksSatMdA = document.getElementsByClassName("tablinkSatMdA");
                for (i = 0; i < x.length; i++) {
                    tablinksSatMdA[i].className = tablinksSatMdA[i].className.replace(" w3-red", "");
                }
                document.getElementById(SatMdAName).style.display = "block";
                evt.currentTarget.className += " w3-red";
            }
        </script>

        <!-- Tab Script - Satellite - SMALL -->
        <script>
            function openSatSm(evt, SatSmName) {
                var i, x, tablinksSatSm;
                x = document.getElementsByClassName("SatSm");
                for (i = 0; i < x.length; i++) {
                    x[i].style.display = "none";
                }
                tablinksSatSm = document.getElementsByClassName("tablinkSatSm");
                for (i = 0; i < x.length; i++) {
                    tablinksSatSm[i].className = tablinksSatSm[i].className.replace(" w3-red", "");
                }
                document.getElementById(SatSmName).style.display = "block";
                evt.currentTarget.className += " w3-red";
            }
        </script>

        <!-- Tab Script - Radar - LARGE -->
        <script>
            function openRad(evt, RadName) {
                var i, x, tablinksRad;
                x = document.getElementsByClassName("Rad");
                for (i = 0; i < x.length; i++) {
                    x[i].style.display = "none";
                }
                tablinksRad = document.getElementsByClassName("tablinkRad");
                for (i = 0; i < x.length; i++) {
                    tablinksRad[i].className = tablinksRad[i].className.replace(" w3-red", "");
                }
                document.getElementById(RadName).style.display = "block";
                evt.currentTarget.className += " w3-red";
            }
        </script>

        <!-- Tab Script - Radar - Medium -->
        <script>
            function openRadMd(evt, RadMdName) {
                var i, x, tablinksRadMd;
                x = document.getElementsByClassName("RadMd");
                for (i = 0; i < x.length; i++) {
                    x[i].style.display = "none";
                }
                tablinksRadMd = document.getElementsByClassName("tablinkRadMd");
                for (i = 0; i < x.length; i++) {
                    tablinksRadMd[i].className = tablinksRadMd[i].className.replace(" w3-red", "");
                }
                document.getElementById(RadMdName).style.display = "block";
                evt.currentTarget.className += " w3-red";
            }
        </script>

        <!-- Tab Script - Radar - SMALL -->
        <script>
            function openRadSm(evt, RadSmName) {
                var i, x, tablinksRadSm;
                x = document.getElementsByClassName("RadSm");
                for (i = 0; i < x.length; i++) {
                    x[i].style.display = "none";
                }
                tablinksRadSm = document.getElementsByClassName("tablinkRadSm");
                for (i = 0; i < x.length; i++) {
                    tablinksRadSm[i].className = tablinksRadSm[i].className.replace(" w3-red", "");
                }
                document.getElementById(RadSmName).style.display = "block";
                evt.currentTarget.className += " w3-red";
            }
        </script>

        <!-- Tab Script - Local - LARGE -->
        <script>
            function openLocal(evt, LocalName) {
                var i, x, tablinksLocal;
                x = document.getElementsByClassName("Local");
                for (i = 0; i < x.length; i++) {
                    x[i].style.display = "none";
                }
                tablinksLocal = document.getElementsByClassName("tablinkLocal");
                for (i = 0; i < x.length; i++) {
                    tablinksLocal[i].className = tablinksLocal[i].className.replace(" w3-red", "");
                }
                document.getElementById(LocalName).style.display = "block";
                evt.currentTarget.className += " w3-red";
            }
        </script>

        <!-- Tab Script - Local - Medium -->
        <script>
            function openLocalMd(evt, LocalMdName) {
                var i, x, tablinksLocalMd;
                x = document.getElementsByClassName("LocalMd");
                for (i = 0; i < x.length; i++) {
                    x[i].style.display = "none";
                }
                tablinksLocalMd = document.getElementsByClassName("tablinkLocalMd");
                for (i = 0; i < x.length; i++) {
                    tablinksLocalMd[i].className = tablinksLocalMd[i].className.replace(" w3-red", "");
                }
                document.getElementById(LocalMdName).style.display = "block";
                evt.currentTarget.className += " w3-red";
            }
        </script>

        <!-- Tab Script - Local - SMALL -->
        <script>
            function openLocalSm(evt, LocalSmName) {
                var i, x, tablinksLocalSm;
                x = document.getElementsByClassName("LocalSm");
                for (i = 0; i < x.length; i++) {
                    x[i].style.display = "none";
                }
                tablinksLocalSm = document.getElementsByClassName("tablinkLocalSm");
                for (i = 0; i < x.length; i++) {
                    tablinksLocalSm[i].className = tablinksLocalSm[i].className.replace(" w3-red", "");
                }
                document.getElementById(LocalSmName).style.display = "block";
                evt.currentTarget.className += " w3-red";
            }
        </script>

        <!-- ** TEST **Menu Script -->
        <script>
            function myFunction() {
                var x = document.getElementById("nchmenu");
                if (x.className.indexOf("w3-show") == -1) {
                    x.className += " w3-show";
                } else {
                    x.className = x.className.replace(" w3-show", "");
                }
            }
        </script>
    </div>

</body>

</html>