import React, { useContext } from "react";
import Swal from "sweetalert2"; 
import ApiContext from "../../Context/ApiContext";
import axios from "axios";
import { FaEdit, FaTrash } from "react-icons/fa";

const Notification = () => {
  const {
    notificationData,
    setNotificationData,
    apiBaseUrl,
    token,
    fetchNotifications,
  } = useContext(ApiContext);

  // Function to handle adding notification
  const handleAddNotification = () => {
    Swal.fire({
      title: "Add Notification",
      html: `
        <div class="flex flex-col space-y-4">
              <input id="title" class="border border-gray-600 rounded-sm px-2" placeholder="Title"/>
              <textarea id="message" class="border border-gray-500 rounded-sm px-2 text-sm" placeholder="Message"></textarea>
              <select id="tag" class="border border-green-500 rounded-sm w-1/2 px-2">
                  <option value="" disabled selected>Select Tag</option>
                  <option value="exam">Exam</option>
                  <option value="general">General</option>
                  <option value="result">Result</option>
              </select>
              </div>
         `,
      showCancelButton: true,
      confirmButtonText: "Add Notification",
      cancelButtonText: "Cancel",
      preConfirm: () => {
        const title = document.getElementById("title").value;
        const message = document.getElementById("message").value;
        const tag = document.getElementById("tag").value;

        if (!title || !message || !tag) {
          Swal.showValidationMessage("Please fill in all fields.");
          return false;
        }
        return { title, message, tags: [tag] };
      },
    }).then((result) => {
      if (result.isConfirmed) {
        const { title, message, tags } = result.value;
        axios
          .post(
            `${apiBaseUrl}notification`,
            { title, message, tags },
            { headers: { Authorization: `Bearer ${token}` } }
          )
          .then((response) => {
            if (response.status === 201) {
              setNotificationData((prevNotifications) => [
                { title, message, tags, createdAt: new Date().toISOString() },
                ...prevNotifications,
              ]);
              Swal.fire("Notification Added!", "", "success");
            } else {
              // Handle unexpected success status (not 201)
              Swal.fire("Error", "Failed to add notification", "error");
            }
          })
          .catch((error) => {
            if (error.response) {
              Swal.fire("Error", error.response.data.message, "error");
            } else {
              Swal.fire("Error", error.message, "error");
            }
          });
      }
    });
  };

  const handleEdit = (notification) => {
    Swal.fire({
      title: "Edit Notification",
      html: `
      <div class="flex flex-col space-y-4">
              <input id="title" class="border border-gray-600 rounded-sm px-2" placeholder="Title" value="${
                notification.title
              }"/>
              <textarea id="message" class="border border-gray-500 rounded-sm px-2 text-sm" placeholder="Message">${
                notification.message
              }</textarea>
              <select id="tags" class="border border-green-500 rounded-sm w-1/2 px-2">
                  <option value="exam" ${
                    notification.tags.includes("exam") ? "selected" : ""
                  }>Exam</option>
                  <option value="general" ${
                    notification.tags.includes("general") ? "selected" : ""
                  }>General</option>
                  <option value="result" ${
                    notification.tags.includes("result") ? "selected" : ""
                  }>Result</option>
              </select>
              </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Update Notification",
      cancelButtonText: "Cancel",
      preConfirm: () => {
        const title = document.getElementById("title").value;
        const message = document.getElementById("message").value;
        const tags = document.getElementById("tags").value;
        return { title, message, tags };
      },
    }).then((result)=>{
      if(result.isConfirmed){
        const {title, message, tags} = result.value;
        axios.patch(`${apiBaseUrl}notification/${notification._id}`, {title, message, tags: [tags]}, {headers: {Authorization: `Bearer ${token}`}}).then((response)=>{
          fetchNotifications();
          Swal.fire("Success", response.data.message, "success");
        }).catch((error)=>{
          Swal.fire("Error", error.response.data.message, "error");
        })
    }});
  }

  const handleDelete = (id) => {
    Swal.fire({
      title:"Are you sure?",
      text:"You won't be able to revert this!",
      icon:"warning",
      showCancelButton:true,
      confirmButtonText:"Yes, delete it!",
      cancelButtonText:"No, cancel!",
    }).then((result)=>{
      if(result.isConfirmed){
        axios.delete(`${apiBaseUrl}notification/${id}`, {headers: {Authorization: `Bearer ${token}`}}).then((response)=>{
          setNotificationData(notificationData.filter((notification) => notification._id !== id));
          Swal.fire("Deleted!", "Notification has been deleted.", "success");
          fetchNotifications();
        }).catch((error)=>{
          Swal.fire("Error", error.response.data.message, "error");
        })
      }
    })
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Manage Notifications</h1>
        <button
          onClick={handleAddNotification}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Add Notification
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {notificationData.map((notification, index) => (
          <div
            key={notification._id || index} // Use `_id` from the API or fallback to index
            className="bg-white shadow-lg rounded-lg p-4 flex flex-col space-y-2 relative"
          >
            <div className="absolute top-2 right-2 flex m-2 flex-wrap space-x-2">
              {notification.tags &&
                notification.tags.map((tag, tagIndex) => (
                  <span
                    key={tagIndex}
                    className="bg-green-200 text-gray-700 border border-green-400 px-2 py-1 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
            </div>
            <div className="absolute bottom-2 right-2 flex m-2 flex-wrap space-x-4 text-2xl">
              <FaEdit
                className="text-yellow-400 hover:text-3xl cursor-pointer hover:text-yellow-500 active:text-yellow-600 transition duration-150 ease-in-out"
                onClick={() => handleEdit(notification)}
              />
              <FaTrash
                className="text-red-600 cursor-pointer hover:text-3xl hover:text-red-700 active:text-red-800 transition duration-150 ease-in-out"
                onClick={() => handleDelete(notification._id)}
              />
            </div>
            <h3 className="text-xl font-semibold">{notification.title}</h3>
            <p>{notification.message}</p>
            <p className="text-gray-500 text-sm">
              {new Date(notification.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notification;
