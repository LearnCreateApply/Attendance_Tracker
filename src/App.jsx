import { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { openDB } from 'idb';
import './App.css';

// IndexedDB setup
const DB_NAME = 'subjects-db';
const STORE_NAME = 'subjects';

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'subjectName' });
      }
    }
  });
}

async function getAllSubjects() {
  const db = await getDB();
  return await db.getAll(STORE_NAME);
}

async function saveSubject(subject) {
  const db = await getDB();
  await db.put(STORE_NAME, subject);
}

async function saveAllSubjects(subjects) {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.store;
  await store.clear();
  for (const subject of subjects) {
    await store.put(subject);
  }
  await tx.done;
}

function App() {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors }
  } = useForm();

  const totalLectures = watch('totalLectures');
  const [addSubject, setAddSubject] = useState(false);
  const [subjectDetails, setSubjectDetails] = useState([]);

  useEffect(() => {
    // Load data from IDB on mount
    (async () => {
      const subjects = await getAllSubjects();
      setSubjectDetails(subjects);
    })();
  }, []);

  const onSubmit = async (data) => {
    const percentage = (data.lectureAttended / data.totalLectures) * 100;
    const updatedData = {
      ...data,
      lectureAttended: parseInt(data.lectureAttended),
      totalLectures: parseInt(data.totalLectures),
      percentage: percentage.toFixed(2)
    };
    const newSubjects = [...subjectDetails.filter(s => s.subjectName !== data.subjectName), updatedData];
    setSubjectDetails(newSubjects);
    await saveAllSubjects(newSubjects);
    setAddSubject(false);
    reset();
  };

  const incrementLecture = async (index, attended) => {
    const updatedSubjects = subjectDetails.map((s, i) => {
      if (i === index) {
        const updated = {
          ...s,
          totalLectures: s.totalLectures + 1,
          lectureAttended: attended ? s.lectureAttended + 1 : s.lectureAttended
        };
        updated.percentage = ((updated.lectureAttended / updated.totalLectures) * 100).toFixed(2);
        return updated;
      }
      return s;
    });
    setSubjectDetails(updatedSubjects);
    await saveAllSubjects(updatedSubjects);
  };

  return (
    <div>
      <div className='herotext'>Attendance Tracker</div>

      <div className="container">
        <button onClick={() => setAddSubject(!addSubject)}>
          {addSubject ? 'Cancel' : 'Add Subject'}
        </button>
      </div>

      {addSubject ? (
        <div className="addSubjectContainer">
          <form onSubmit={handleSubmit(onSubmit)}>
            <input
              type="text"
              placeholder='Subject Name'
              {...register("subjectName", {
                required: "Subject name is required",
                minLength: { value: 2, message: "Minimum 2 characters" },
                maxLength: { value: 5, message: "Use short form" }
              })}
            />
            {errors.subjectName && <span className="error">{errors.subjectName.message}</span>}

            <input
              type="number"
              placeholder='Lecture Attended'
              {...register("lectureAttended", {
                required: "Lectures Attended is required.",
                min: { value: 0, message: "Attended Lectures cannot be negative" },
                validate: (value) =>
                  parseInt(value) <= parseInt(totalLectures || 0) ||
                  "Total Lectures se jada lecture attend kiya kya bhai"
              })}
            />
            {errors.lectureAttended && <span className="error">{errors.lectureAttended.message}</span>}

            <input
              type="number"
              placeholder='Total Lectures Done'
              {...register("totalLectures", {
                required: "Total Lectures is required.",
                min: { value: 0, message: "Total Lectures cannot be negative" }
              })}
            />
            {errors.totalLectures && <span className="error">{errors.totalLectures.message}</span>}

            <input type="submit" value="Save Subject" />
          </form>
        </div>
      ) : (
        <div className="grid">
          {subjectDetails.map((subject, index) => (
            <div key={index} className='subjects'>
              <ul>
                <li>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong>{subject.subjectName}</strong>
                    <span>{subject.lectureAttended}/{subject.totalLectures}</span>
                    <span>{subject.percentage}%</span>
                  </div>
                  <div className='tworow'>
                    <button onClick={() => incrementLecture(index, true)}>+</button>
                    <span>Attended</span>
                    <button onClick={() => incrementLecture(index, false)}>-</button>
                    <span>Skipped</span>
                  </div>
                </li>
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
