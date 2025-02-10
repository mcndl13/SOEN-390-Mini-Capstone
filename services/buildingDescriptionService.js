export function getBuildingDescription(building) {
  if (building == "LB Building") {
    return "The Library Building is home to the newly renovated library. The Departments of English, History, Études françaises and Mathematics and Statistics are also here. Other notable places include the Welcome Centre (for tours), the Birks Student Service Centre, the Leonard and Bina Ellen Gallery, the Art Supply Store and the Concordia Store.";
  } else if (building == "Hall Building") {
    return "The Hall Building is where students take classes in Economics, Geography, Political Science, Sociology and Anthropology. Also located in the H Building: The Student Success Centre (for mentoring and other resources), the Otsenhákta Student Centre, the greenhouse (a leafy, sunny space to study!) and the D.B. Clarke Theatre.";
  } else if (building == "Guy-de Maisonneuve") {
    return "The GM building is home to several administrative offices as well as: the Access Centre for Students with Disabilities, the International Students Office, Health Services, Office of Rights and Responsibilities, the Financial Aid and Awards Office.";
  } else if (building == "EV Building") {
    return "The EV Building is a two-tower research and teaching facility that brings together the Faculty of Fine Arts with the Gina Cody School of Engineering and Computer Science. The building is equipped with labs and spaces for research and creation. Our fitness facility, Le Gym, is also located here.";
  } else if (building == "JMSB") {
    return "The MB Building is the 15-storey home of the John Molson School of Business, made up of study areas, lecture rooms and group work spaces. The John Dobson Formula Growth Investment Room gives finance students practical knowledge of the markets through financial software. The Faculty of Fine Arts’ performance spaces for theatre, contemporary dance and music are also here.";
  } else if (building == "FB Building" || building == "FG Building") {
    return "The Faubourg Building houses the Office of the Registrar, Centre for Continuing Education, the Department of Education, the Department of Classics, Modern Languages and Linguistics and the Mel Hoppenheim School of Cinema. District 3, Concordia’s start-up incubator for aspiring entrepreneurs, is also located here. ";
  } else if (building == "Grey Nuns Building") {
    return "Our gorgeous Grey Nuns student residence is full of character, with spacious rooms, high ceilings and lots of light. The converted chapel is an awe-inspiring Reading Room open to the whole University community. Comfortable, safe and close to class — students feel right at home on campus. Note: This space is not open for campus visitors.";
  } else if (building == "Visual Arts Building") {
    return "Classes for the Departments of Studio Arts, Creative Art Therapies, Art History and Art Education are located here. You’ll also find the VAV Gallery, a student-run exhibition space.";
  } else if (building == "Oscar Peterson Concert Hall") {
    return "The Oscar Peterson Concert Hall was named in honour of one of the best jazz pianists of all time. Peterson, a Montreal native, was awarded an honorary doctorate and the Loyola medal, the University’s highest honour. The 570-seat performance venue hosts more than 200 shows a year, many with internationally-renowned artists. The Student Centre (SC) is home to a student-run café, a lounge and study spots.";
  } else if (
    building == "Hingston Hall, wing HA" ||
    building == "Hingston Hall, wing B" ||
    building == "Hingston Hall, wing HC"
  ) {
    return "Hingston Hall and the Jesuit Residence are home away from home for the hundreds of Concordians who live on campus. Note: This space is not open for campus visitors.";
  } else if (building == "Quadrangle") {
    return "The Quad is an expansive green space where students relax between classes on warm days. Frosh activities, barbecues and outdoor concerts take place here.";
  } else if (
    building == "Central Building" ||
    building == "Administration Building"
  ) {
    return "The AD and CC Buildings house Health Services, the Loyola College for Diversity and Sustainability, Counselling and Development (for personal, educational and career counselling), the Access Centre for Students with Disabilities and the Multi-Faith and Spirituality Centre.";
  } else if (building == "F. C. Smith Building") {
    return "The Loyola Chapel is a beautiful, quiet place available to people of all faiths. Students use the F.C. Smith Auditorium for theatrical productions and workshops. Concerts and other events take place at The Cazalet Theatre.";
  } else if (building == "Richard J Renaud Science Complex") {
    return "The Richard J. Renaud Science Pavilion is the main building for students in biology, chemistry and biochemistry, physics, exercise science and psychology. It also houses the Science College, a specialized learning community dedicated to solving current problems through lab work and research.";
  } else if (building == "Applied Science Hub") {
    return "The recently completed Applied Science Hub is Concordia’s home for interdisciplinary scientific research, with labs for aquatic biology, microscopy, cellular imaging, nanoscience, bioprocessing, and chemical and materials engineering. It also hosts the District 3 Innovation Hub, a start-up incubator, promoting industry scale-up and partnership opportunities on-site.";
  } else if (building == "Communication Studies and Journalism Building") {
    return "The CJ Building is where our Communication Studies and Journalism students take classes and make use of media labs, plus video production and editing suites. The Concordia Bookstore is also here.";
  } else if (building == "Center for Structural and Functional Genomics") {
    return "The Research Centre for Structural and Functional Genomics Building is Concordia’s largest multidisciplinary research centre, bringing together biologists, chemists and bioinformaticians.";
  } else if (building == "Recreation and Athletics Complex") {
    return "The Recreation and Athletics Complex contains a gymnasium, an arena and a dome for our varsity athletes — the Stingers — to compete in football, basketball, hockey, rugby, soccer and wrestling. The Stinger Dome, an air-supported structure, covers the field from November to April, so Concordians can join a game of soccer or Ultimate all year round. The Stingers hockey teams play at the Ed Meagher Arena.";
  } else if (building == "Perform Center") {
    return "The PERFORM Centre is a clinical research facility focused on promoting healthy living through prevention. It includes: A gym furnished with the latest and best equipment; an athletic therapy clinic with specialized wellness programs including cooking workshops and exercise plans; and facilities for Athletic Therapy and Exercise Science students to undertake research.";
  } else {
    return building;
  }
}
