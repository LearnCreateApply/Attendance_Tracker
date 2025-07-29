import { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { openDB } from 'idb';
import './App.css';

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

async function deleteSubjectFromDB(subjectName) {
  const db = await getDB();
  await db.delete(STORE_NAME, subjectName);
}

function App() {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors }
  } = useForm();

  const totalLectures = watch('totalLectures');
  const [addSubject, setAddSubject] = useState(false);
  const [subjectDetails, setSubjectDetails] = useState([]);
  const [editIndex, setEditIndex] = useState(null);

  useEffect(() => {
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

    let newSubjects;
    if (editIndex !== null) {
      newSubjects = [...subjectDetails];
      newSubjects[editIndex] = updatedData;
      setEditIndex(null);
    } else {
      newSubjects = [...subjectDetails.filter(s => s.subjectName !== data.subjectName), updatedData];
    }

    setSubjectDetails(newSubjects);
    await saveAllSubjects(newSubjects);
    setAddSubject(false);
    reset();
  };

  const startEditing = (index) => {
    const subject = subjectDetails[index];
    setValue("subjectName", subject.subjectName);
    setValue("lectureAttended", subject.lectureAttended);
    setValue("totalLectures", subject.totalLectures);
    setEditIndex(index);
    setAddSubject(true);
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

  const handleDelete = async () => {
    if (editIndex !== null) {
      const subjectName = subjectDetails[editIndex].subjectName;
      const newSubjects = subjectDetails.filter((_, i) => i !== editIndex);
      setSubjectDetails(newSubjects);
      await deleteSubjectFromDB(subjectName);
      setEditIndex(null);
      reset();
      setAddSubject(false);
    }
  };

  return (
    <div>
      <div className='herotext'>Attendance Tracker</div>

      <div className="container">
        <button onClick={() => {
          setAddSubject(!addSubject);
          setEditIndex(null);
          reset();
        }}>
          {addSubject ? 'Cancel' : 'Add Subject'}
        </button>
      </div>

      {addSubject ? (
        <div className="addSubjectContainer">
          <form onSubmit={handleSubmit(onSubmit)}>
            <input
              type="text"
              placeholder='Subject Name'
              disabled={editIndex !== null}
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
              <div style={{
                display:'flex',
                justifyContent:'center'
              }}>

            <button type="submit">{editIndex !== null ? "Update Subject" : "Save Subject"}</button>

            {editIndex !== null && (
              <button
              type="button"
              onClick={handleDelete}
              >
                Delete Subject
              </button>
            )}
            </div>
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
                    <button style={{ margin: '0 1em' }} onClick={() => incrementLecture(index, true)}>⊕ Attended</button>
                    <button style={{ margin: '0 1em' }} onClick={() => incrementLecture(index, false)}>⊖ Skipped</button>
                    <button style={{ margin: '0 1em' }} onClick={() => startEditing(index)}>✎ Edit</button>
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
