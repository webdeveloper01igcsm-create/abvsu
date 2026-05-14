function getGrade(marks) {
  if (marks >= 90) return "A+";
  if (marks >= 80) return "A";
  if (marks >= 70) return "B+";
  if (marks >= 60) return "B";
  if (marks >= 50) return "C+";
  if (marks >= 40) return "C";
  return "F";
}

function getTotalCreditPoints(marksArray) {
  const gradePointMap = {
    "A+": 10,
    A: 9,
    "B+": 8,
    B: 7,
    "C+": 6,
    C: 5,
    D: 4,
    F: 0,
  };

  let totalCreditPoints = 0;

  for (const item of marksArray) {
    // coerce to number ('' or null → 0, undefined → NaN)
    const marks = Number(item.marksObtained);
    const maxMarks = Number(item.subjectId?.maxMarks);
    const credits = Number(item.subjectId?.credits);

    // skip if either is NaN or zero credits
    if (isNaN(marks) || isNaN(credits) || credits === 0) continue;

    const grade = getGrade(
      Math.round((marks / maxMarks) * 100)
    );
    // const grade = getGrade(marks);
    const gradePoint = gradePointMap[grade] ?? 0;

    totalCreditPoints += gradePoint * credits;
  }

  return totalCreditPoints;
}

function getTotal(marks, name) {
  return marks.reduce((total, item) => {
    if (name === "marksObtained") {
      return total + Number(item.marksObtained);
    } else if (name === "maxMarks") {
      return total + Number(item.subjectId.maxMarks);
    } else if (name === "credits") {
      return total + Number(item.subjectId.credits);
    }
    return total;
  }, 0);
}

function getSGPA(marksArray) {
  const totalCredits = getTotal(marksArray, "credits");
  if (totalCredits === 0) return 0;

  const totalCreditPoints = getTotalCreditPoints(marksArray);
  return (totalCreditPoints / totalCredits).toFixed(2);
}

function getCGPA(allSemestersMarks) {
  if (!Array.isArray(allSemestersMarks) || allSemestersMarks.length === 0) {
    return 0;
  }

  const sgpaArray = allSemestersMarks.map((marks) => Number(getSGPA(marks)));

  const total = sgpaArray.reduce((sum, sgpa) => sum + sgpa, 0);
  return (total / sgpaArray.length).toFixed(2);
}

module.exports = { getSGPA, getCGPA };